import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import "./Header.css";

export default function Header() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [totalVideos, setTotalVideos] = useState(0);

  // Load số lượng video Supabase
  useEffect(() => {
    const loadCount = async () => {
      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true });
      setTotalVideos(count || 0);
    };
    loadCount();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (logout) logout();
    navigate("/");
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("openSearchPopup", {}));
  };

  return (
    <div className="header-container">
      <Link to="/" className="header-logo">Video App</Link>

      <div className="header-right">

        {/* Nếu chưa đăng nhập */}
        {!user ? (
          <>
            <Link className="header-btn" to="/login">Đăng nhập</Link>
            <Link className="header-btn" to="/signup">Đăng ký</Link>
          </>
        ) : (
          <>
            {/* 
              ICON KÍNH LÚP – KHÔNG có box, không có nền
              Badge nhỏ nằm góc trên phải
            */}
            <div
              onClick={openSearch}
              style={{
                position: "relative",
                cursor: "pointer",
                display: "flex",
                alignItems: "center"
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

              {/* Badge tổng số video */}
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
                  color: "white"
                }}
              >
                {totalVideos}
              </span>
            </div>

            <Link to={`/profile/${user.id}`} className="header-avatar-link">
              <img
                src={profile?.avatar_url || "/default-avatar.png"}
                alt="avatar"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover"
                }}
              />
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
