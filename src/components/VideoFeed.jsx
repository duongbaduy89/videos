import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import CommentPanel from "./CommentPanel";
import useAuth from "../hooks/useAuth";
import "./VideoFeed.css";

export default function VideoFeed() {
  const { user } = useAuth();

  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);

  // COMMENT UI
  const [showComments, setShowComments] = useState(false);
  const [commentVideo, setCommentVideo] = useState(null);

  // Load videos
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

  // SWIPE
  const startY = useRef(0);
  const lastY = useRef(0);
  const isDragging = useRef(false);

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

  // HANDLE LIKE (requires login)
  const handleLike = () => {
    if (!user) {
      alert("Bạn cần đăng nhập để like!");
      window.location.href = "/login";
      return;
    }
    alert("Like thành công (sau này sẽ ghi vào Supabase)");
  };

  // HANDLE COMMENT BUTTON
  const openComments = () => {
    if (!user) {
      alert("Bạn cần đăng nhập để bình luận!");
      window.location.href = "/login";
      return;
    }

    setCommentVideo(videos[currentIndex]);
    setShowComments(true);
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
        {!user && (
          <>
            <button className="nav-btn" onClick={() => (window.location.href = "/login")}>
              Login
            </button>
            <button className="nav-btn" onClick={() => (window.location.href = "/signup")}>
              Signup
            </button>
          </>
        )}

        {user && (
          <button className="nav-btn" onClick={() => supabase.auth.signOut()}>
            Logout
          </button>
        )}

        <button className="upload-btn" onClick={() => (window.location.href = "/upload")}>
          Upload
        </button>
      </div>

      {/* VIDEO PLAYER */}
      {videos.length > 0 ? (
        <TwitterVideoPlayer
          key={videos[currentIndex].id}
          videoUrl={videos[currentIndex].url}
          autoPlayEnabled={hasInteracted || currentIndex > 0}
          onUserPlay={() => setHasInteracted(true)}
          onOpenComments={openComments}
          onLike={handleLike}
        />
      ) : (
        <div className="loading-text">Đang tải video...</div>
      )}

      {/* COMMENT PANEL */}
      {showComments && (
        <CommentPanel
          video={commentVideo}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
