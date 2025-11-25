import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./Header.css";

export default function Header() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (logout) logout();
    navigate("/");
  };

  const openSearch = () => {
    // dispatch a global event to open search popup in VideoFeed
    window.dispatchEvent(new CustomEvent("openSearchPopup", {}));
  };

  return (
    <div className="header-container">
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
            <button className="icon-btn search-icon" onClick={openSearch} title="Tìm kiếm">
              🔍
            </button>

            <Link to={`/profile/${user.id}`} className="header-avatar-link">
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

            <Link className="header-btn" to="/upload">
              Upload
            </Link>

            <button className="header-btn logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
