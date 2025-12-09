// src/components/ProfileSidebar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import "../styles/ProfileSidebar.css";

export default function ProfileSidebar() {
  const { user, signOut } = useAuth();

  // ❗ Hook luôn phải ở đầu — KHÔNG return trước
  const [open, setOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [friends, setFriends] = useState([]);

  const navigate = useNavigate();

  // ❗ Hook chạy bình thường
  useEffect(() => {
    if (!user?.id) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();
      setProfileData(data || null);
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const loadFriends = async () => {
      const { data: rows } = await supabase
        .from("friends")
        .select("id, user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!rows || rows.length === 0) {
        setFriends([]);
        return;
      }

      const friendIds = rows.map((r) =>
        r.user_id === user.id ? r.friend_id : r.user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", friendIds);

      setFriends(profiles || []);
    };

    loadFriends();
  }, [user]);

  // ❗ CHỈ return JSX — KHÔNG return trước hooks
  if (!user) {
    return null; // safe vì hooks đã chạy xong
  }

  return (
    <>
      {/* Nút avatar mở sidebar */}
      <button className="sidebar-avatar-btn" onClick={() => setOpen(true)}>
        <img
          src={profileData?.avatar_url || "/default-avatar.png"}
          alt="avatar"
          className="sidebar-avatar-img"
        />
      </button>

      {open && (
        <div className="sidebar-overlay" onClick={() => setOpen(false)} />
      )}

      {/* SIDEBAR CHÍNH */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: open ? 0 : -260 }}
        transition={{ type: "spring", damping: 22 }}
        className="sidebar-panel"
      >
        <div className="sidebar-user-info">
          <img
            src={profileData?.avatar_url || "/default-avatar.png"}
            className="sidebar-user-avatar"
          />
          <div>
            <p className="sidebar-username">
              {profileData?.username || "User"}
            </p>
            <p className="sidebar-email">@{user.email}</p>
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-menu">
          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate(`/profile/${user.id}`);
              setOpen(false);
            }}
          >
            Trang cá nhân
          </button>

          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate(`/profile/${user.id}?edit=1`);
              setOpen(false);
            }}
          >
            Chỉnh sửa hồ sơ
          </button>

          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate(`/profile/${user.id}#videos`);
              setOpen(false);
            }}
          >
            Video đã upload
          </button>

          <button
            className="sidebar-link-btn"
            onClick={() => {
              navigate("/upload");
              setOpen(false);
            }}
          >
            Upload Video
          </button>

          {/* MỞ POPUP BẠN BÈ */}
          <button
            className="sidebar-link-btn"
            onClick={() => setFriendsOpen(true)}
          >
            Danh sách bạn bè
          </button>

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

      {/* POPUP BẠN BÈ */}
      {friendsOpen && (
        <>
          <div
            className="sidebar-overlay"
            onClick={() => setFriendsOpen(false)}
          />

          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="sidebar-panel friends-panel"
          >
            <h3 className="friends-title">Bạn bè</h3>

            <div className="friends-list">
              {friends.length === 0 && (
                <p className="friends-empty">Bạn chưa có bạn bè nào.</p>
              )}

              {friends.map((f) => (
                <div
                  key={f.id}
                  className="friend-item"
                  onClick={() => {
                    navigate(`/profile/${f.id}`);
                    setOpen(false);
                    setFriendsOpen(false);
                  }}
                >
                  <img
                    src={f.avatar_url || "/default-avatar.png"}
                    className="friend-avatar"
                  />
                  <div className="friend-info">
                    <p className="friend-username">
                      {f.username || "Không tên"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </>
  );
}
