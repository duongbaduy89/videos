// src/pages/MessagesPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // gom theo user đối phương
      const map = {};
      msgs.forEach((m) => {
        const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;

        if (!map[other]) {
          map[other] = m; // vì msgs đã sort DESC nên m là tin nhắn mới nhất
        }
      });

      const ids = Object.keys(map);

      if (ids.length === 0) return setList([]);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);

      const finalList = profiles
        .map((p) => ({
          user: p,
          lastMsg: map[p.id],
        }))
        .sort(
          (a, b) =>
            new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at)
        );

      setList(finalList);
    };

    load();
  }, [user]);

  return (
    <div className="messages-page">
      <h2>Tin nhắn</h2>

      <div className="conversation-list">
        {list.map(({ user: u, lastMsg }) => (
          <div
            className="conversation-item"
            key={u.id}
            onClick={() => navigate(`/chat/${u.id}`)}
          >
            <div className="conv-avatar">
              <img src={u.avatar_url || "/default-avatar.png"} />
            </div>

            <div className="conv-info">
              <div className="conv-username">@{u.username}</div>

              <div className="conv-text">
                {lastMsg.image_url
                  ? "📷 Ảnh"
                  : lastMsg.content?.slice(0, 40) || ""}
              </div>
            </div>
          </div>
        ))}

        {list.length === 0 && (
          <div style={{ padding: 20, color: "#aaa" }}>
            Chưa có cuộc trò chuyện nào
          </div>
        )}
      </div>
    </div>
  );
}
