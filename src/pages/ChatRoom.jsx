// src/pages/ChatRoom.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function ChatRoom() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const listRef = useRef(null);
  const realtimeRef = useRef(null);

  useEffect(() => {
    loadMessages();
    subscribeMessages();
    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("loadMessages", error);
      return;
    }
    setMessages(data || []);
    setTimeout(() => scrollToBottom(), 50);
  };

  const subscribeMessages = () => {
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    const ch = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages((m) => [...m, payload.new]);
        setTimeout(() => scrollToBottom(), 50);
      })
      .subscribe();

    realtimeRef.current = ch;
  };

  const scrollToBottom = () => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  };

  const sendMessage = async () => {
    if (!text.trim() && !file) return;
    let attachment_url = null;
    if (file) {
      // upload to Cloudflare worker 'chatfr' - expects 'file' form field and returns {success:true, publicUrl:...}
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "imgmess/");
        const res = await fetch("https://chatfr.workers.dev", { method: "POST", body: fd });
        const j = await res.json();
        if (!j.success) throw new Error("upload failed");
        attachment_url = j.publicUrl || j.url;
      } catch (err) {
        console.error("upload err", err);
        alert("Upload ảnh thất bại");
      }
    }

    try {
      await supabase.from("messages").insert([{ conversation_id: conversationId, sender_id: user.id, content: text || null, attachment_url }]);
      setText("");
      setFile(null);
    } catch (err) {
      console.error("sendMessage err", err);
    }
  };

  return (
    <div style={{ padding: 16, color: "white", display: "flex", flexDirection: "column", height: "80vh" }}>
      <div ref={listRef} style={{ overflowY: "auto", flex: 1, padding: 12, border: "1px solid #1f2937", borderRadius: 8 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12, display: "flex", flexDirection: m.sender_id === user.id ? "row-reverse" : "row", gap: 8 }}>
            <div style={{ maxWidth: "70%", padding: 8, background: m.sender_id === user.id ? "#0ea5e9" : "#111827", borderRadius: 8 }}>
              {m.content && <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>}
              {m.attachment_url && <img src={m.attachment_url} alt="att" style={{ maxWidth: "200px", borderRadius: 6, marginTop: 8 }} />}
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{new Date(m.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn..." style={{ flex: 1, padding: 8, borderRadius: 8, background: "#0b1220", color: "white", border: "1px solid #23303b" }} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={sendMessage} style={{ padding: "8px 12px", borderRadius: 8, background: "#0ea5e9", border: "none", cursor: "pointer" }}>Gửi</button>
      </div>
    </div>
  );
}
