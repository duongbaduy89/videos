import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import "./VideoFeed.css";

export default function VideoFeed() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // swipe refs
  const startY = useRef(0);
  const lastY = useRef(0);
  const isDragging = useRef(false);

  // Load video list from Supabase
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false });

      setVideos(data || []);
    };
    load();
  }, []);

  // MOBILE TOUCH
  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    lastY.current = startY.current;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    lastY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const delta = lastY.current - startY.current;

    // cần vuốt đủ mạnh
    if (delta > 100) {
      setCurrentIndex((i) => Math.max(i - 1, 0));
    } else if (delta < -100) {
      setCurrentIndex((i) => Math.min(i + 1, videos.length - 1));
    }
  };

  // PC scroll
  const handleWheel = (e) => {
    if (e.deltaY > 0) {
      setCurrentIndex((i) => Math.min(i + 1, videos.length - 1));
    } else {
      setCurrentIndex((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div
      className="videofeed-wrapper"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* TOP NAV */}
      <div className="top-nav">
        <button className="nav-btn" onClick={() => (window.location.href = "/login")}>
          Login
        </button>
        <button className="nav-btn" onClick={() => (window.location.href = "/signup")}>
          Signup
        </button>
        <button className="upload-btn" onClick={() => (window.location.href = "/upload")}>
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
