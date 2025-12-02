import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    load();

    // Realtime listener
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*, sender:profiles!sender_id(username, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifs(data || []);
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div style={{ position: "relative", marginRight: 12 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", position: "relative" }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -8,
              background: "red",
              color: "white",
              borderRadius: "10px",
              fontSize: 10,
              padding: "1px 5px",
            }}
          >
            {unread}
          </span>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 28,
            width: 260,
            background: "#111",
            color: "white",
            borderRadius: 10,
            padding: 10,
            border: "1px solid #333",
            maxHeight: 300,
            overflowY: "auto",
            zIndex: 999,
          }}
        >
          <b style={{ fontSize: 14 }}>Thông báo</b>

          {notifs.length === 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#aaa" }}>
              Chưa có thông báo
            </div>
          )}

          {notifs.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "6px 0",
                fontSize: 13,
                borderBottom: "1px solid #222",
                opacity: n.read ? 0.6 : 1,
              }}
            >
              <b>@{n.sender?.username}</b>{" "}
              {n.type === "like" ? "đã thích" : "đã bình luận"} video của bạn
              <div style={{ fontSize: 11, color: "#888" }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
