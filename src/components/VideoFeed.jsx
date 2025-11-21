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

  // USER PROFILE
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

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

  // LIKE
  const handleLike = () => {
    if (!user) {
      alert("Bạn cần đăng nhập để like!");
      window.location.href = "/login";
      return;
    }
    alert("Like (sẽ lưu vào supabase sau)");
  };

  // OPEN COMMENTS
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
    <div className="videofeed-wrapper">

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
          <>
            <div className="nav-username">👤 {profile?.username}</div>
            <button className="nav-btn" onClick={() => supabase.auth.signOut()}>
              Logout
            </button>
          </>
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
          autoPlayEnabled={currentIndex > 0}
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
