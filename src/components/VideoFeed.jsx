import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import "./VideoFeed.css";

// =====================================
//  CHỈ LOAD VIDEO – KHÔNG CÒN UPLOAD Ở ĐÂY
// =====================================

export default function VideoFeed() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // ============================
  // LOAD VIDEO TỪ SUPABASE CHÍNH
  // ============================
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setVideos(data || []);
  };

  // ============================
  // SWIPE MOBILE
  // ============================
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const onTouchEnd = () => {
    const swipe = touchEndY.current - touchStartY.current;
    if (swipe > 80) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    } else if (swipe < -80) {
      setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1));
    }
  };

  // ============================
  // SCROLL PC
  // ============================
  const onWheel = (e) => {
    if (e.deltaY > 0) {
      setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1));
    } else {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  return (
    <div
      className="videofeed-wrapper"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* TOP NAV */}
      <div className="top-nav">
        <button className="nav-btn" onClick={() => (window.location.href = "/signup")}>
          Đăng ký
        </button>

        <button className="nav-btn" onClick={() => (window.location.href = "/login")}>
          Đăng nhập
        </button>

        {/* ⭐ NÚT UPLOAD MỚI → CHUYỂN TRANG */}
        <button
          className="upload-btn"
          onClick={() => (window.location.href = "/upload")}
        >
          Upload
        </button>
      </div>

      {/* VIDEO PLAYER */}
      {videos.length > 0 ? (
        <TwitterVideoPlayer
          key={videos[currentIndex].id}
          videoUrl={videos[currentIndex].url}
        />
      ) : (
        <div className="loading-text">Đang tải video...</div>
      )}
    </div>
  );
}
