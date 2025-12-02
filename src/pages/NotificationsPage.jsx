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
  const [filter, setFilter] = useState("all"); // all | like | comment | follow
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
      // navigate to video page; if you open Comments panel use query param
      if (n.type === "comment") navigate(`/video/${n.video_id}?openComments=true`);
      else navigate(`/video/${n.video_id}`);
      return;
    }

    // fallback: open profile of sender
    if (n.sender_id) {
      navigate(`/profile/${n.sender_id}`);
    }
  };

  return (
    <div className="notifications-page-root">
      <div className="notifications-topbar">
        <div className="nt-left">
          <h2>Thông báo</h2>
          <div className="nt-sub">{unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo mới"}</div>
        </div>

        <div className="nt-actions">
          <div className="nt-filters">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
            <button className={filter === "like" ? "active" : ""} onClick={() => setFilter("like")}>Likes</button>
            <button className={filter === "comment" ? "active" : ""} onClick={() => setFilter("comment")}>Comments</button>
            <button className={filter === "follow" ? "active" : ""} onClick={() => setFilter("follow")}>Follows</button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="small" onClick={markAllRead}>Đánh dấu đã đọc</button>
          </div>
        </div>
      </div>

      <div className="notifications-list" ref={containerRef}>
        {loading && <div className="center muted">Đang tải...</div>}

        {!loading && list.length === 0 && (
          <div className="center muted">Bạn chưa có thông báo nào.</div>
        )}

        {list.map((n) => (
          <div
            key={n.id}
            className={`notif-item ${n.read ? "read" : "unread"}`}
            onClick={() => onClickNotif(n)}
          >
            <div className="notif-left">
              <img
                src={n.sender?.avatar_url || "/default-avatar.png"}
                alt={n.sender?.username || "avatar"}
                className="notif-avatar"
              />
            </div>

            <div className="notif-body">
              <div className="notif-text">
                <b>@{n.sender?.username || "someone"}</b>{" "}
                {n.type === "like" && "đã thích video của bạn"}
                {n.type === "comment" && "đã bình luận: "}
                {n.type === "follow" && "đã theo dõi bạn"}
                {/* if comment, show excerpt */}
                {n.type === "comment" && n.video?.title && (
                  <span className="muted"> — trên “{n.video.title}”</span>
                )}
              </div>

              <div className="notif-meta">
                <div className="time">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            </div>

            <div className="notif-right">
              {n.video?.url && (
                <img
                  src={n.video.url}
                  alt={n.video.title}
                  className="notif-thumb"
                  onClick={(e) => {
                    e.stopPropagation();
                    // navigate to video page
                    navigate(`/video/${n.video_id}`);
                  }}
                />
              )}

              <div className="notif-actions">
                {!n.read && (
                  <button
                    className="mark-read"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await markAsRead(n.id);
                    }}
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
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}

        {loadingMore && <div className="center muted">Đang tải thêm...</div>}

        {!loading && !loadingMore && hasMore && list.length > 0 && (
          <div className="center">
            <button className="load-more" onClick={() => loadNotifications({ reset: false })}>
              Tải thêm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
