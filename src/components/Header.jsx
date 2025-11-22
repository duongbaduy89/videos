import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./Header.css";

export default function Header() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();  // Đăng xuất khỏi Supabase

    if (logout) logout();           // Xóa state user trong AuthContext

    navigate("/");                  // Quay về trang chủ
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
            <span className="header-username">
              {profile?.username || "User"}
            </span>

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
