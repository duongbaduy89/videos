import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!user) return;

    const loadConversations = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) return console.error(error);

      // Map latest message per conversation
      const convMap = {};
      data.forEach((msg) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap[otherId]) convMap[otherId] = msg;
      });
      setConversations(Object.entries(convMap));
    };

    loadConversations();

    // Realtime subscription
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            setConversations((prev) => {
              const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
              const filtered = prev.filter(([id]) => id !== otherId);
              return [[otherId, msg], ...filtered];
            });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const openChat = (otherId) => {
    navigate(`/chat/${otherId}`);
  };

  return (
    <div className="messages-page">
      <h2>Cuộc trò chuyện</h2>
      <div className="conversation-list">
        {conversations.map(([otherId, msg]) => (
          <div
            key={otherId}
            className="conversation-item"
            onClick={() => openChat(otherId)}
          >
            <div className="conv-avatar">
              <img src={msg.sender_avatar || "/default-avatar.png"} alt="" />
            </div>
            <div className="conv-info">
              <div className="conv-username">@{msg.sender_username || "User"}</div>
              <div className="conv-text">{msg.content}</div>
            </div>
          </div>
        ))}
        {conversations.length === 0 && <div>Chưa có cuộc trò chuyện nào</div>}
      </div>
    </div>
  );
}
