// src/components/ProfileSidebar.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import "../styles/ProfileSidebar.css";

export default function ProfileSidebar() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null; // không hiển thị sidebar khi chưa login

  return (
    <>
      {/* Avatar fixed trên góc trái */}
      <button className="sidebar-avatar-btn" onClick={() => setOpen(true)}>
        <img
          src={user.user_metadata?.avatar_url || "/default-avatar.png"}
          alt="avatar"
          className="sidebar-avatar-img"
        />
      </button>

      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar panel */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: open ? 0 : -260 }}
        transition={{ type: "spring", damping: 22 }}
        className="sidebar-panel"
      >
        {/* User info */}
        <div className="sidebar-user-info">
          <img
            src={user.user_metadata?.avatar_url || "/default-avatar.png"}
            className="sidebar-user-avatar"
          />
          <div>
            <p className="sidebar-username">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="sidebar-email">@{user.email}</p>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* MENU */}
        <nav className="sidebar-menu">

          {/* Trang cá nhân */}
          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate(`/profile/${user.id}`);
              setOpen(false);
            }}
          >
            Trang cá nhân
          </button>

          {/* Chỉnh sửa hồ sơ (mở popup) */}
          <button
            className="sidebar-link-btn"
            onClick={() => {
            // chuyển đến trang profile của tôi và gửi query mở popup
              navigate(`/profile/${user.id}?edit=1`);
              setOpen(false);
            }}
          >
            Chỉnh sửa hồ sơ
          </button>

          {/* Video đã upload */}
          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate(`/profile/${user.id}#videos`);
              setOpen(false);
            }}
          >
            Video đã upload
          </button>

          {/* Upload Video */}
          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate("/upload");
              setOpen(false);
            }}
          >
            Upload Video
          </button>

          {/* Logout */}
          <button
            className="sidebar-logout"
            onClick={async () => {
              await signOut();
              window.location.href = "/login";
            }}
          >
            Đăng xuất
          </button>
        </nav>
      </motion.div>
    </>
  );
}
