import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import NotificationBell from "./NotificationBell";
import "./Header.css";

export default function Header() {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [totalVideos, setTotalVideos] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const chatChannelRef = useRef(null);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/upload") {
      const loadCount = async () => {
        const { count } = await supabase
          .from("videos")
          .select("*", { count: "exact", head: true });
        setTotalVideos(count || 0);
      };
      loadCount();
    }
  }, [location.pathname]);

  // ----------------- Load số tin nhắn chưa đọc -----------------
  const loadUnreadMessages = async () => {
    if (!user) return;
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact" })
      .eq("receiver_id", user.id)
      .eq("read", false);
    if (!error) setUnreadMessages(count || 0);
  };

  // ----------------- Realtime tin nhắn -----------------
  useEffect(() => {
    if (!user) return;

    loadUnreadMessages();

    // Tạo channel realtime
    const channel = supabase
      .channel("header-chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // có tin nhắn mới gửi đến user hiện tại
          setUnreadMessages((prev) => prev + 1);
        }
      )
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (logout) logout();
    navigate("/");
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("openSearchPopup", {}));
  };

  if (authLoading) {
    return <div className="header-container">Loading...</div>;
  }

  const isLoggedIn = !!user;

  return (
    <div className="header-container">
      <Link to="/" className="header-logo">VIDSXXX</Link>

      <div className="header-right">
        {!isLoggedIn ? (
          <>
            <Link className="header-btn" to="/login">Đăng nhập</Link>
            <Link className="header-btn" to="/signup">Đăng ký</Link>
            <Link className="header-btn" to="/login">Upload</Link>
          </>
        ) : (
          <>
            {/* Search icon */}
            <div
              onClick={openSearch}
              style={{
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>

              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  background: "#1DA1F2",
                  padding: "1px 5px",
                  borderRadius: "10px",
                  fontSize: "10px",
                  fontWeight: "600",
                  color: "white",
                }}
              >
                {totalVideos}
              </span>
            </div>

            {/* 🔔 Notifications */}
            <NotificationBell />

            {/* 💬 Chat / Tin nhắn */}
            <div
              className="header-chat"
              onClick={() => {
                setUnreadMessages(0); // click vào chat thì reset số chưa đọc
                navigate("/messages");
              }}
              style={{ cursor: "pointer", marginLeft: 10, position: "relative" }}
              title="Tin nhắn"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"></path>
              </svg>

              {unreadMessages > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#ef4444",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: 10,
                    fontWeight: "600",
                    width: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {unreadMessages}
                </span>
              )}
            </div>

            {/* Avatar */}
            <Link
              to={`/profile/${user?.id}`}
              className="header-avatar-link"
            >
              <img
                src={profile?.avatar_url || "/default-avatar.png"}
                alt="avatar"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            </Link>

            {/* Upload */}
            <Link className="header-btn" to="/upload">
              Upload
            </Link>

            {/* Logout */}
            <button className="header-btn logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
