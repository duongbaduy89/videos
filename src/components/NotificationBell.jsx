// src/components/NotificationBell.jsx
import React, { useState, useEffect } from "react";
import { FaBell } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, is_read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifs();

    // realtime
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
        () => {
          setUnreadCount((prev) => prev + 1);

          // thêm hiệu ứng rung
          const bell = document.getElementById("notif-icon");
          if (bell) {
            bell.classList.add("shake");
            setTimeout(() => bell.classList.remove("shake"), 600);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const goToNotifications = () => {
    navigate("/notifications");
  };

  return (
    <div
      id="notif-icon"
      onClick={goToNotifications}
      style={{
        position: "relative",
        cursor: "pointer",
        padding: 8,
        borderRadius: 8,
        border: "2px solid black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FaBell color="white" size={20} />

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
  );
}
