// src/pages/ChatRoom.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../styles/ChatRoom.css";   // ← THÊM DÒNG NÀY

const WORKER_URL = "https://chatfr.dataphim002.workers.dev";

export default function ChatRoom() {
  const { user_id } = useParams();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);

  const [previewImage, setPreviewImage] = useState(null);

  const bottomRef = useRef();

  // Load profile đối phương
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user_id)
        .single();
      setOtherUser(data);
    };
    loadUser();
  }, [user_id]);

  // Load tin nhắn
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${user_id}),and(sender_id.eq.${user_id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (!error) {
        setMessages(data || []);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });

        await supabase
          .from("messages")
          .update({ read: true })
          .eq("receiver_id", user.id)
          .eq("sender_id", user_id);
      }
    };

    load();
  }, [user_id, user?.id]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${user.id}-${user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === user.id && msg.receiver_id === user_id) ||
            (msg.sender_id === user_id && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user_id, user?.id]);

  // Gửi text
  const sendMessage = async () => {
    if (!text.trim()) return;

    const { data } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: user.id,
          receiver_id: user_id,
          content: text,
          image_url: null,
          read: false,
        },
      ])
      .select()
      .single();

    setMessages((prev) => [...prev, data]);
    setText("");
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Upload ảnh
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const uploadRes = await fetch(WORKER_URL, {
        method: "POST",
        body: form,
      });
      const json = await uploadRes.json();

      const { data } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: user.id,
            receiver_id: user_id,
            content: "",
            image_url: json.url,
            read: false,
          },
        ])
        .select()
        .single();

      setMessages((prev) => [...prev, data]);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      alert("Upload thất bại!");
    }

    setUploading(false);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="chat-room">

      {/* HEADER */}
      <div className="chat-header">
        <Link to="/messages" className="back-btn">←</Link>
        <img
          src={otherUser?.avatar_url || "/default-avatar.png"}
          className="chat-header-avatar"
        />
        <div className="chat-username">@{otherUser?.username}</div>
      </div>

      {/* MESSAGES */}
      <div className="chat-messages">
        {messages.map((msg) => {
          const mine = msg.sender_id === user.id;

          return (
            <div
              className={`chat-row ${mine ? "row-right" : "row-left"}`}
              key={msg.id}
            >
              {!mine && (
                <img
                  src={otherUser?.avatar_url || "/default-avatar.png"}
                  className="bubble-avatar"
                />
              )}

              <div className="bubble-container">
                {msg.image_url ? (
                  <img
                    src={msg.image_url}
                    className="chat-image-thumb"
                    onClick={() => setPreviewImage(msg.image_url)}
                  />
                ) : (
                  <div className={`chat-msg ${mine ? "sent" : "received"}`}>
                    {msg.content}
                  </div>
                )}

                <div className="msg-time">{formatTime(msg.created_at)}</div>
                {mine && msg.read && <div className="msg-seen">Đã xem</div>}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef}></div>
      </div>

      {/* INPUT */}
      <form
        className="chat-input-fixed"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <label className="upload-icon">
          📷
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </label>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nhắn tin..."
        />

        <button type="submit" disabled={uploading}>
          {uploading ? "Đang gửi..." : "Gửi"}
        </button>
      </form>

      {previewImage && (
        <div
          className="preview-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} className="preview-full" />
        </div>
      )}
    </div>
  );
}
