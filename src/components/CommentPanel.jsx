import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchComments,
  postComment as apiPostComment,
  deleteComment as apiDeleteComment,
} from "../api/comments";
import { supabase } from "../supabaseClient";
import "../styles/commentPanel.css";

function CommentItem({ c, depth = 0, onReply, onDelete, replyingTo, setReplyingTo }) {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className="comment-item" style={{ marginLeft: depth * 14 }}>
      <div className="comment-main">
        <Link to={`/profile/${c.user_id}`} className="comment-avatar-wrap">
          <img
            src={c.user?.avatar_url || "/default-avatar.png"}
            alt={c.user?.username || "avatar"}
            className="comment-avatar"
          />
        </Link>

        <div className="comment-bubble">
          <div className="comment-meta">
            <Link to={`/profile/${c.user_id}`} className="comment-username">
              @{c.user?.username || "unknown"}
            </Link>
            <span className="comment-time">
              {" • "}{new Date(c.created_at).toLocaleString()}
            </span>
          </div>

          <div className="comment-content">{c.content}</div>

          <div className="comment-actions">
            <button
              className="c-action"
              onClick={() => {
                onReply(c.id, c.user?.username);
                setReplyingTo(c.id);
              }}
            >
              Reply
            </button>

            {onDelete && (
              <button
                className="c-action"
                onClick={() => onDelete(c.id)}
                style={{ color: "#ff6b6b" }}
              >
                Delete
              </button>
            )}

            {c.children?.length > 0 && (
              <button
                className="c-action"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? "Ẩn câu trả lời" : `Hiện câu trả lời (${c.children.length})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplies &&
        c.children?.map((ch) => (
          <CommentItem
            key={ch.id}
            c={ch}
            depth={depth + 1}
            onReply={onReply}
            onDelete={onDelete}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
          />
        ))}
    </div>
  );
}

export default function CommentPanel({ video, onClose }) {
  const { user } = useAuth();
  const [commentsTree, setCommentsTree] = useState([]);
  const [flatComments, setFlatComments] = useState([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyPlaceholder, setReplyPlaceholder] = useState("");

  useEffect(() => {
    if (!video) return;
    load();
  }, [video]);

  const load = async () => {
    const list = await fetchComments(video.id);
    setFlatComments(list || []);
    const tree = buildTree(list || []);
    setCommentsTree(tree);
  };

  const buildTree = (list) => {
    const map = {};
    list.forEach((c) => (map[c.id] = { ...c, children: [] }));
    const roots = [];
    list.forEach((c) => {
      if (c.parent_id) {
        const parent = map[c.parent_id];
        if (parent) parent.children.push(map[c.id]);
        else roots.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    const sortRec = (nodes) => {
      nodes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      nodes.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  };

  const sendComment = async (parentId = null) => {
    if (!user) {
      alert("Bạn cần đăng nhập để bình luận!");
      return;
    }
    const content = (parentId ? textForReply() : text).trim();
    if (!content) return;

    try {
      setPosting(true);

      const newComment = await apiPostComment({
        user_id: user.id,
        video_id: video.id,
        content,
        parent_id: parentId || null,
      });

      // 🔔 TẠO THÔNG BÁO COMMENT
      if (video.user_id !== user.id) {
        await supabase.from("notifications").insert([
          {
            user_id: video.user_id,
            from_user_id: user.id,
            video_id: video.id,
            type: "comment",
            is_read: false,
          },
        ]);
      }

      await load();
      setText("");
      setReplyingTo(null);
      setReplyPlaceholder("");
    } finally {
      setPosting(false);
    }
  };

  const onReply = (commentId, username) => {
    setReplyingTo(commentId);
    setReplyPlaceholder(username ? `@${username} ` : "");
    setTimeout(() => {
      const el = document.querySelector(".comment-input");
      if (el) el.focus();
    }, 50);
  };

  const textForReply = () => text;

  const handleDelete = async (commentId) => {
    if (!user) return;
    const comment = flatComments.find((c) => c.id === commentId);
    if (!comment) return;
    if (comment.user_id !== user.id) {
      alert("Bạn chỉ có thể xóa bình luận của chính mình.");
      return;
    }
    if (!confirm("Bạn có chắc muốn xóa bình luận này?")) return;
    await apiDeleteComment(commentId);
    await load();
  };

  return (
    <div className="comment-overlay" onClick={onClose}>
      <div className="comment-panel" onClick={(e) => e.stopPropagation()}>
        <div className="comment-header">
          <b>Bình luận</b>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="comment-list">
          {commentsTree.length === 0 && (
            <div className="empty">
              Chưa có bình luận nào — trở thành người đầu tiên nhé!
            </div>
          )}
          {commentsTree.map((c) => (
            <CommentItem
              key={c.id}
              c={c}
              onReply={onReply}
              onDelete={handleDelete}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>

        {/* Input row */}
        <div className="comment-input-row">
          <input
            className="comment-input"
            placeholder={
              replyingTo ? replyPlaceholder || "Nhập reply..." : "Nhập bình luận..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                sendComment(replyingTo);
              }
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {replyingTo && (
              <button
                className="comment-cancel-reply"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyPlaceholder("");
                  setText("");
                }}
                disabled={posting}
              >
                Hủy
              </button>
            )}
            <button
              className="comment-send"
              onClick={() => sendComment(replyingTo)}
              disabled={posting}
            >
              {posting ? "Đang gửi..." : replyingTo ? "Gửi reply" : "Gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
