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

  return (
    <div className="header-container">
      <Link to="/" className="header-logo">
        Video App
      </Link>

      <div className="header-right">
        {!user ? (
          <>
            <Link className="header-btn" to="/login">Đăng nhập</Link>
            <Link className="header-btn" to="/signup">Đăng ký</Link>
          </>
        ) : (
          <>
            {/* ===========================
                BẤM USERNAME → MỞ PROFILE
            ============================ */}
            <Link
              to={`/profile/${user.id}`}
              className="header-username"
              style={{ cursor: "pointer", textDecoration: "none" }}
            >
              @{profile?.username}
            </Link>

            <Link className="header-btn" to="/upload">Upload</Link>

            <button className="header-btn logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
