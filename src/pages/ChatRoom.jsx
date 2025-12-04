import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function ChatRoom() {
  const { user_id } = useParams();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef();

  // Load other user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user_id).single();
      setOtherUser(data);
    };
    loadUser();
  }, [user_id]);

  // Load messages
  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) console.error(error);
      setMessages(data || []);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    loadMessages();
  }, [user_id, user?.id]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${user.id}-${user_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          if ((msg.sender_id === user.id && msg.receiver_id === user_id) ||
              (msg.sender_id === user_id && msg.receiver_id === user.id)) {
            setMessages((prev) => [...prev, msg]);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user_id, user?.id]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const { data, error } = await supabase.from("messages").insert([{
      sender_id: user.id,
      receiver_id: user_id,
      content: text,
      read: false
    }]).select().single();

    if (error) return console.error(error);

    setMessages((prev) => [...prev, data]); // hiển thị ngay
    setText("");
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <Link to="/messages" className="back-btn">←</Link>
        <div className="chat-username">{otherUser?.username || "Đang tải..."}</div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg ${msg.sender_id === user.id ? "sent" : "received"}`}>
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      <div className="chat-input-area">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn tin..."
        />
        <button onClick={sendMessage}>Gửi</button>
      </div>
    </div>
  );
}
