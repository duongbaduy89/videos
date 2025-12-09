// src/components/XBottomNav.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

import NotificationBell from "./NotificationBell";
import ModalUploadOption from "./ModalUploadOption";
import "../styles/xnav.css";

export default function XBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [totalVideos, setTotalVideos] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [openUploadMenu, setOpenUploadMenu] = useState(false);
  const chatChannelRef = useRef(null);

  // Load total video count (Search badge)
  useEffect(() => {
    const loadCount = async () => {
      const { count } = await supabase
        .from("videos")
        .select("id", { count: "exact", head: true });

      setTotalVideos(count || 0);
    };
    loadCount();
  }, []);

  // LOAD số tin nhắn chưa đọc
  const loadUnreadMessages = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (!error) setUnreadMessages(count || 0);
  };

  // Realtime + load lần đầu
  useEffect(() => {
    if (authLoading) return; // đợi user load xong
    if (!user) return;

    loadUnreadMessages();

    const channel = supabase
      .channel("xnav-chat-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => setUnreadMessages((prev) => prev + 1)
      )
      .subscribe();

    chatChannelRef.current = channel;

    return () => {
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
    };
  }, [user, authLoading]);

  // Open Search Popup
  const handleSearch = () => {
    window.dispatchEvent(new CustomEvent("openSearchPopup", {}));
  };

  // Upload menu
  const handleUpload = () => {
    if (!user) {
      navigate("/login", { state: { from: location.pathname || "/" } });
      return;
    }
    setOpenUploadMenu(true);
  };

  const handleSelectUploadType = (type) => {
    setOpenUploadMenu(false);

    if (type === "photo") navigate("/createpost");
    else if (type === "video") navigate("/upload");
  };

  // Mở messages KHÔNG reset badge sai
  const handleMessages = () => {
    navigate("/messages");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="x-bottom-nav" aria-label="Bottom navigation">
        <ul className="x-nav-list">

          {/* HOME */}
          <li className="x-nav-item">
            <button
              className="x-icon-btn"
              aria-label="Home"
              onClick={() => navigate("/")}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isActive("/") ? "white" : "none"}
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="x-icon"
              >
                <path d="M3 9.5L12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
              </svg>
            </button>
          </li>

          {/* SEARCH */}
          <li className="x-nav-item" onClick={handleSearch}>
            <button className="x-icon-btn" aria-label="Search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="x-icon"
              >
                <circle cx="11" cy="11" r="6" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="x-badge-small">{totalVideos}</span>
            </button>
          </li>

          {/* UPLOAD */}
          <li className="x-nav-item x-center-item">
            <button
              className="x-plus-btn"
              aria-label="Upload"
              onClick={handleUpload}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="x-plus-icon"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </li>

          {/* NOTIFICATIONS */}
          <li className="x-nav-item">
            <button
              className="x-icon-btn"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
            >
              <NotificationBell fromNav={true} />
            </button>
          </li>

          {/* MESSAGES */}
          <li className="x-nav-item">
            <button
              className="x-icon-btn"
              aria-label="Messages"
              onClick={handleMessages}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="x-icon"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>

              {unreadMessages > 0 && (
                <span className="x-badge-red">{unreadMessages}</span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* SPACER */}
      <div className="x-bottom-spacer" />

      {/* POPUP UPLOAD */}
      <ModalUploadOption
        open={openUploadMenu}
        onClose={() => setOpenUploadMenu(false)}
        onSelect={handleSelectUploadType}
      />
    </>
  );
}
