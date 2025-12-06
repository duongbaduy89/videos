import React, { useState, useEffect, useRef } from "react";
import { FaBell } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ fromNav = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const popupRef = useRef();

  /* -----------------------------------
   * Load & realtime notifications
   * ----------------------------------- */
  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `id, user_id, from_user_id, type, video_id, is_read, created_at,
           sender:profiles!from_user_id(id,username,avatar_url),
           video:videos(id,title,url)`
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifs();

    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 10));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  /* -----------------------------------
   * Click outside to close popup
   * ----------------------------------- */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -----------------------------------
   * Handle click notification
   * ----------------------------------- */
  const handleClickNotif = (n) => {
    setOpen(false);

    if (!n.is_read) {
      supabase.from("notifications").update({ is_read: true }).eq("id", n.id);

      setNotifications((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p))
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (n.type === "friend_request" || n.type === "friend_accept") {
      navigate(`/profile/${n.from_user_id}`);
      return;
    }

    if (n.type === "like" && n.video_id) {
      navigate(`/video/${n.video_id}`);
      return;
    }

    if (n.type === "comment" && n.video_id) {
      navigate(`/video/${n.video_id}?openComments=true`);
      return;
    }

    navigate(`/profile/${n.from_user_id}`);
  };

  /* -----------------------------------
   * Popup style (dynamic direction)
   * ----------------------------------- */
  const popupStyle = {
    position: "fixed",
    width: 300,
    maxHeight: 400,
    overflowY: "auto",
    background: "#111827",
    color: "white",
    border: "1px solid #1f2937",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    zIndex: 5000,
    right: 16,

    // Nếu từ bottom nav → popup mở LÊN (bottom: nav-height)
    ...(fromNav
      ? { bottom: 70 } // mở popup lên trên
      : { top: 40, position: "absolute", right: 0 }) // header: mở xuống dưới
  };

  return (
    <div style={{ position: fromNav ? "static" : "relative" }}>
      {/* Icon */}
      <div
        id="notif-icon"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          cursor: "pointer",
          padding: 8,
          borderRadius: 8,
          border: fromNav ? "none" : "2px solid black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <FaBell color="white" size={20} />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "red",
              color: "white",
              borderRadius: "50%",
              width: 18,
              height: 18,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* Popup */}
      {open && (
        <div ref={popupRef} style={popupStyle}>
          {notifications.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", color: "#9ca3af" }}>
              Không có thông báo mới
            </div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClickNotif(n)}
              style={{
                display: "flex",
                gap: 8,
                padding: 10,
                alignItems: "center",
                background: n.is_read ? "transparent" : "#1f2937",
                cursor: "pointer",
                borderBottom: "1px solid #374151",
              }}
            >
              <img
                src={n.sender?.avatar_url || "/default-avatar.png"}
                alt={n.sender?.username || "user"}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  objectFit: "cover",
                }}
              />
              <div style={{ flex: 1, fontSize: 14 }}>
                {n.type === "friend_request" &&
                  `@${n.sender?.username} gửi lời mời kết bạn`}
                {n.type === "friend_accept" &&
                  `@${n.sender?.username} chấp nhận lời mời kết bạn`}
                {n.type === "like" &&
                  `@${n.sender?.username} đã thích video của bạn`}
                {n.type === "comment" &&
                  `@${n.sender?.username} bình luận: ${n.video?.title || ""}`}
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
