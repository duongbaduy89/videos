import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Notifications.css";

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      let q = supabase
        .from("notifications")
        .select(
          `id, user_id, from_user_id, type, video_id, comment_id, is_read, created_at,
           sender:profiles!from_user_id(id, username, avatar_url),
           video:videos(id,title,url)`
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("type", filter);

      const { data } = await q;
      setNotifications(data || []);
    };

    load();
  }, [user, filter]);

  // ✔ Navigate đúng feed video
  const handleClick = async (n) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((p) =>
        p.map((i) => (i.id === n.id ? { ...i, is_read: true } : i))
      );
    }

    if (n.type === "like" && n.video_id) {
      navigate(`/?video=${n.video_id}`);
      return;
    }

    if (n.type === "comment" && n.video_id) {
      navigate(`/?video=${n.video_id}&openComments=true`);
      return;
    }

    if (n.from_user_id) navigate(`/profile/${n.from_user_id}`);
  };

  return (
    <div className="notifications-page-root">
      {/* Header */}
      <div className="notifications-topbar">
        <h2>Thông báo</h2>
        <div className="nt-sub">
          {notifications.filter((n) => !n.is_read).length} chưa đọc
        </div>
      </div>

      {/* Tabs */}
      <div className="nt-filters">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
          Tất cả
        </button>
        <button className={filter === "like" ? "active" : ""} onClick={() => setFilter("like")}>
          Likes
        </button>
        <button className={filter === "comment" ? "active" : ""} onClick={() => setFilter("comment")}>
          Comments
        </button>
        <button
          className={filter === "friend_request" ? "active" : ""}
          onClick={() => setFilter("friend_request")}
        >
          Lời mời kết bạn
        </button>
        <button
          className={filter === "friend_accept" ? "active" : ""}
          onClick={() => setFilter("friend_accept")}
        >
          Chấp nhận
        </button>
      </div>

      {/* List */}
      <div className="notifications-list">
        {notifications.length === 0 && (
          <div className="center muted">Không có thông báo</div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            className={`notif-item ${n.is_read ? "read" : "unread"}`}
            onClick={() => handleClick(n)}
          >
            <img
              src={n.sender?.avatar_url || "/default-avatar.png"}
              alt="avatar"
            />

            <div className="notif-content">
              <div>
                <b>@{n.sender?.username}</b>{" "}
                {n.type === "like" && "đã thích video của bạn"}
                {n.type === "comment" && "đã bình luận video của bạn"}
                {n.type === "friend_request" && "gửi lời mời kết bạn"}
                {n.type === "friend_accept" && "đã chấp nhận lời mời"}
              </div>

              {n.video?.title && (
                <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                  Video: {n.video.title}
                </div>
              )}

              <div className="notif-time">
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
