// src/components/CommentPanel.jsx
import React, { useEffect, useState } from "react";
import { fetchComments, postComment } from "../api/comments";
import { useAuth } from "../context/AuthContext";
import "../styles/CommentPanel.css";

export default function CommentPanel({ video, onClose }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [text, setText] = useState("");

  const isPhoto = video.type === "photo";
  const field = isPhoto ? "photo_id" : "video_id";

  useEffect(() => {
    load();
  }, [video?.id]);

  const load = async () => {
    const data = await fetchComments(video.id, isPhoto ? "photo" : "video");
    setList(data);
  };

  const send = async () => {
    if (!text.trim()) return;

    const payload = {
      user_id: user?.id,
      content: text,
      video_id: isPhoto ? null : video.id,
      photo_id: isPhoto ? video.id : null,
    };

    const inserted = await postComment(payload);
    setList((prev) => [...prev, inserted]);
    setText("");
  };

  return (
    <div className="commentpanel-overlay">
      <div className="commentpanel">
        <div className="comment-header">
          Bình luận
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="comment-list">
          {list.map((c) => (
            <div className="comment-item" key={c.id}>
              <img src={c.user?.avatar_url || "/default-avatar.png"} className="c-avatar" />
              <div className="c-body">
                <div className="c-username">@{c.user?.username}</div>
                <div className="c-content">{c.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="comment-input-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Viết bình luận..."
          />
          <button onClick={send}>Gửi</button>
        </div>
      </div>
    </div>
  );
}
