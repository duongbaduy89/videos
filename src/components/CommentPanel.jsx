import React, { useEffect, useState } from "react";
import { fetchComments, postComment } from "../api/comments";

export default function CommentPanel({ video, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!video) return;
    const load = async () => {
      const list = await fetchComments(video.id);
      setComments(list);
    };
    load();
  }, [video]);

  const sendComment = async () => {
    if (!text.trim()) return;

    const newComment = await postComment(video.user_id, video.id, text);
    setComments((prev) => [...prev, newComment]);
    setText("");
  };

  if (!video) return null;

  return (
    <div className="comment-panel-bg" onClick={onClose}>
      <div className="comment-panel" onClick={(e) => e.stopPropagation()}>
        <div className="comment-header">
          <b>Bình luận</b>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="comment-list">
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-user">
                <img src={c.user?.avatar_url || "/default-avatar.png"} className="comment-avatar" />
                <span className="comment-username">{c.user?.username}</span>
              </div>
              <div className="comment-content">{c.content}</div>
            </div>
          ))}
        </div>

        <div className="comment-input-row">
          <input
            className="comment-input"
            placeholder="Viết bình luận..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="comment-send" onClick={sendComment}>Gửi</button>
        </div>
      </div>
    </div>
  );
}
