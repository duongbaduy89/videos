import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./Header.css";

export default function Header() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (logout) logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (search.trim().length === 0) return;
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  return (
    <>
      {/* ================= HEADER CHÍNH ================= */}
      <div className="header-container">
        {/* LOGO */}
        <Link to="/" className="header-logo">
          Video App
        </Link>

        <div className="header-right">
          {!user ? (
            <>
              <Link className="header-btn" to="/login">
                Đăng nhập
              </Link>
              <Link className="header-btn" to="/signup">
                Đăng ký
              </Link>
            </>
          ) : (
            <>
              {/* AVATAR */}
              <Link
                to={`/profile/${user.id}`}
                className="header-avatar-link"
                style={{ display: "flex", alignItems: "center" }}
              >
                <img
                  src={profile?.avatar_url || "/default-avatar.png"}
                  alt="avatar"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #fff",
                    marginRight: 10,
                  }}
                />
              </Link>

              {/* UPLOAD */}
              <Link className="header-btn" to="/upload">
                Upload
              </Link>

              {/* LOGOUT */}
              <button className="header-btn logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* ================= NAV TABS GIỐNG TIKTOK ================= */}
      <div className="header-tabs">
        <Link className={`tab-item ${isActive("/") ? "active" : ""}`} to="/">
          Dành cho bạn
        </Link>

        <Link
          className={`tab-item ${isActive("/following") ? "active" : ""}`}
          to="/following"
        >
          Đang Follow
        </Link>

        <Link
          className={`tab-item ${isActive("/liked") ? "active" : ""}`}
          to="/liked"
        >
          Yêu thích
        </Link>

        {/* ICON SEARCH */}
        <form onSubmit={handleSearchSubmit} className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="search-btn">
            🔍
          </button>
        </form>
      </div>
    </>
  );
}
