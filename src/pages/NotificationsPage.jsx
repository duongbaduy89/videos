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
  const containerRef = useRef(null);
  const realtimeRef = useRef(null);

  // initial load + filter change
  useEffect(() => {
    if (!user) return;
    offsetRef.current = 0;
    setHasMore(true);
    setList([]);
    loadNotifications({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  // realtime inserts
  useEffect(() => {
    if (!user) return;
    // unsubscribe previous
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const channel = supabase
      .channel("notifications-page-" + user.id)
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
          // apply filter
          if (filter !== "all" && n.type !== filter) return;
          setList((prev) => [n, ...prev]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const buildSelect = () =>
    `id, user_id, sender_id, type, video_id, read, created_at,
     sender:profiles!sender_id(id,username,avatar_url),
     video:videos(id,title,url)`;

  const loadNotifications = async ({ reset = false } = {}) => {
    if (!user) return;
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
        console.error("load notifications error", error);
        return;
      }

      const normalized = data || [];
      if (reset) setList(normalized);
      else setList((prev) => [...prev, ...normalized]);

      offsetRef.current = offset + normalized.length;
      setHasMore((offset + normalized.length) < (count || 0));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreIfNeeded = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadNotifications({ reset: false });
  }, [hasMore, loadingMore, loading]);

  // infinite scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const bottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (bottom < 180) {
        loadMoreIfNeeded();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMoreIfNeeded]);

  const markAsRead = async (id) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
      setList((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotif = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;
    try {
      await supabase.from("notifications").delete().eq("id", id);
      setList((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = list.filter((n) => !n.read).length;

  const onClickNotif = async (n) => {
    // mark read
    if (!n.read) await markAsRead(n.id);

    // navigate to related content (video)
    if (n.video_id) {
      if (n.type === "comment") navigate(`/video/${n.video_id}?openComments=true`);
      else navigate(`/video/${n.video_id}`);
      return;
    }

    // friend related
    if (n.type === "friend_request" || n.type === "friend_accept") {
      if (n.data && n.data.from) {
        navigate(`/profile/${n.data.from}`);
        return;
      }
      if (n.sender_id) {
        navigate(`/profile/${n.sender_id}`);
        return;
      }
    }

    // fallback: open profile of sender
    if (n.sender_id) {
      navigate(`/profile/${n.sender_id}`);
    }
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
            <button className={filter === "like" ? "active" : ""} onClick={() => setFilter("like")}>Likes</button>
            <button className={filter === "comment" ? "active" : ""} onClick={() => setFilter("comment")}>Comments</button>
            <button className={filter === "follow" ? "active" : ""} onClick={() => setFilter("follow")}>Follows</button>
            <button className={filter === "friend_request" ? "active" : ""} onClick={() => setFilter("friend_request")}>Friend requests</button>
            <button className={filter === "friend_accept" ? "active" : ""} onClick={() => setFilter("friend_accept")}>Friend accepts</button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="small" onClick={markAllRead}>Đánh dấu đã đọc</button>
          </div>
        </div>
      </div>

      <div className="notifications-list" ref={containerRef} style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
        {loading && <div className="center muted">Đang tải...</div>}

        {!loading && list.length === 0 && (
          <div className="center muted" style={{ color: "#9ca3af" }}>Bạn chưa có thông báo nào.</div>
        )}

        {list.map((n) => (
          <div
            key={n.id}
            className={`notif-item ${n.read ? "read" : "unread"}`}
            onClick={() => onClickNotif(n)}
            style={{
              display: "flex",
              gap: 12,
              padding: 12,
              borderBottom: "1px solid #1f2937",
              alignItems: "center",
              background: n.read ? "transparent" : "#071133"
            }}
          >
            <div className="notif-left">
              <img
                src={n.sender?.avatar_url || "/default-avatar.png"}
                alt={n.sender?.username || "avatar"}
                className="notif-avatar"
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
              />
            </div>

            <div className="notif-body" style={{ flex: 1 }}>
              <div className="notif-text" style={{ color: "#e2e8f0" }}>
                <b style={{ marginRight: 6 }}>@{n.sender?.username || (n.data?.from ? n.data.from : "someone")}</b>{" "}
                {n.type === "like" && "đã thích video của bạn"}
                {n.type === "comment" && "đã bình luận: "}
                {n.type === "follow" && "đã theo dõi bạn"}
                {n.type === "friend_request" && "gửi lời mời kết bạn"}
                {n.type === "friend_accept" && "đã chấp nhận lời mời kết bạn"}
                {/* if comment, show excerpt */}
                {n.type === "comment" && n.video?.title && (
                  <span className="muted" style={{ color: "#9ca3af" }}> — trên “{n.video.title}”</span>
                )}
              </div>

              <div className="notif-meta" style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
                <div className="time">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="notif-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              {n.video?.url && (
                <img
                  src={n.video.url}
                  alt={n.video.title}
                  className="notif-thumb"
                  style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/video/${n.video_id}`);
                  }}
                />
              )}

              <div className="notif-actions" style={{ display: "flex", gap: 6 }}>
                {!n.read && (
                  <button
                    className="mark-read"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await markAsRead(n.id);
                    }}
                    style={{ padding: "4px 8px", background: "#10b981", borderRadius: 6, border: "none", cursor: "pointer" }}
                  >
                    Đã đọc
                  </button>
                )}
                <button
                  className="delete"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await deleteNotif(n.id);
                  }}
                  style={{ padding: "4px 8px", background: "#ef4444", borderRadius: 6, border: "none", cursor: "pointer", color: "white" }}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}

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
