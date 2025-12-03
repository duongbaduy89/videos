// src/pages/NotificationsPage.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../styles/Notifications.css";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("all"); // all | like | comment | follow | friend_request | friend_accept
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const realtimeRef = useRef(null);

  // Build select string to include sender profile + video info
  const buildSelect = () =>
    `id, user_id, from_user_id, type, video_id, comment_id, is_read, created_at,
     sender:profiles!from_user_id(id,username,avatar_url),
     video:videos(id,title,url)`;

  // Load notifications with pagination & optional filter
  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!user) return;
      if (loading || loadingMore) return;

      try {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        const offset = reset ? 0 : offsetRef.current;

        let q = supabase
          .from("notifications")
          .select(buildSelect(), { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (filter !== "all") q = q.eq("type", filter);

        const { data, count, error } = await q;

        if (error) {
          console.error("loadNotifications error", error);
          return;
        }

        const normalized = data || [];
        if (reset) setList(normalized);
        else setList((prev) => [...prev, ...normalized]);

        offsetRef.current = offset + (normalized.length || 0);
        setHasMore((offset + (normalized.length || 0)) < (count || 0));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, filter, loading, loadingMore]
  );

  useEffect(() => {
    if (!user) return;
    offsetRef.current = 0;
    setHasMore(true);
    setList([]);
    loadNotifications({ reset: true });
  }, [user, filter, loadNotifications]);

  // Realtime: listen INSERT and UPDATE for notifications
  useEffect(() => {
    if (!user) return;

    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new;
          if (filter !== "all" && n.type !== filter) return;
          setList((prev) => [n, ...prev]);

          const bell = document.getElementById("notif-icon");
          if (bell) {
            bell.classList.add("shake");
            setTimeout(() => bell.classList.remove("shake"), 700);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new;
          setList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [user, filter]);

  // mark single notification as read
  const markAsRead = async (id) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (e) {
      console.error("markAsRead error", e);
    }
  };

  // mark all as read
  const markAllRead = async () => {
    if (!user) return;
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("markAllRead error", e);
    }
  };

  // delete notification
  const deleteNotif = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;
    try {
      await supabase.from("notifications").delete().eq("id", id);
      setList((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("deleteNotif error", e);
    }
  };

  const onClickNotif = async (n) => {
    try {
      if (!n.is_read) await markAsRead(n.id);

      if (n.type === "friend_request" || n.type === "friend_accept") {
        if (n.from_user_id) navigate(`/profile/${n.from_user_id}`);
        return;
      }

      if ((n.type === "comment" || n.type === "like") && n.video_id) {
        if (n.type === "comment") navigate(`/video/${n.video_id}?openComments=true`);
        else navigate(`/video/${n.video_id}`);
        return;
      }

      if (n.from_user_id) navigate(`/profile/${n.from_user_id}`);
    } catch (err) {
      console.error("onClickNotif error", err);
    }
  };

  const unreadCount = list.filter((n) => !n.is_read).length;

  const renderItem = (n) => {
    const senderName = n.sender?.username || n.from_user_id || "someone";
    const senderAvatar = n.sender?.avatar_url || "/default-avatar.png";

    let text = "";
    if (n.type === "friend_request") text = `@${senderName} đã gửi lời mời kết bạn`;
    else if (n.type === "friend_accept") text = `@${senderName} đã chấp nhận lời mời kết bạn`;
    else if (n.type === "like") text = `${senderName} đã thích video của bạn`;
    else if (n.type === "comment") text = `${senderName} đã bình luận: ${n.video?.title ? `“${n.video.title}”` : ""}`;
    else text = `${senderName} — ${n.type}`;

    return (
      <div
        key={n.id}
        className={`notif-item ${n.is_read ? "read" : "unread"}`}
        onClick={() => onClickNotif(n)}
        style={{
          display: "flex",
          gap: 12,
          padding: 12,
          borderBottom: "1px solid #1f2937",
          alignItems: "center",
          background: n.is_read ? "transparent" : "#071133",
          cursor: "pointer",
        }}
      >
        <img
          src={senderAvatar}
          alt={senderName}
          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#e2e8f0", fontSize: 14 }}>
            <b style={{ marginRight: 6 }}>@{senderName}</b>
            <span style={{ color: "#e2e8f0" }}>{text.replace(`@${senderName}`, "")}</span>
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
            {new Date(n.created_at).toLocaleString()}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {!n.is_read && (
            <button
              onClick={async (e) => { e.stopPropagation(); await markAsRead(n.id); }}
              style={{ padding: "4px 8px", background: "#10b981", borderRadius: 6, border: "none", cursor: "pointer" }}
            >
              Đã đọc
            </button>
          )}
          <button
            onClick={async (e) => { e.stopPropagation(); await deleteNotif(n.id); }}
            style={{ padding: "4px 8px", background: "#ef4444", borderRadius: 6, border: "none", cursor: "pointer", color: "white" }}
          >
            Xóa
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="notifications-page-root" style={{ color: "white", padding: 16 }}>
      <div className="notifications-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="nt-left">
          <h2 style={{ margin: 0 }}>Thông báo</h2>
          <div className="nt-sub" style={{ color: "#9ca3af", fontSize: 13 }}>
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo mới"}
          </div>
        </div>

        <div className="nt-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="nt-filters" style={{ display: "flex", gap: 8 }}>
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
            <button className={filter === "friend_request" ? "active" : ""} onClick={() => setFilter("friend_request")}>Friend requests</button>
            <button className={filter === "friend_accept" ? "active" : ""} onClick={() => setFilter("friend_accept")}>Friend accepts</button>
            <button className={filter === "like" ? "active" : ""} onClick={() => setFilter("like")}>Likes</button>
            <button className={filter === "comment" ? "active" : ""} onClick={() => setFilter("comment")}>Comments</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="small" onClick={markAllRead} style={{ padding: "6px 10px", borderRadius: 8, background: "#374151", color: "white", border: "none", cursor: "pointer" }}>Đánh dấu đã đọc</button>
          </div>
        </div>
      </div>

      <div className="notifications-list" style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
        {loading && <div className="center muted">Đang tải...</div>}
        {!loading && list.length === 0 && <div className="center muted" style={{ color: "#9ca3af" }}>Bạn chưa có thông báo nào.</div>}
        {list.map((n) => renderItem(n))}
        {loadingMore && <div className="center muted">Đang tải thêm...</div>}
        {!loading && !loadingMore && hasMore && list.length > 0 && (
          <div className="center" style={{ textAlign: "center", padding: 12 }}>
            <button className="load-more" onClick={() => loadNotifications({ reset: false })} style={{ padding: "8px 12px", borderRadius: 8, background: "#0ea5e9", border: "none", cursor: "pointer" }}>
              Tải thêm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
