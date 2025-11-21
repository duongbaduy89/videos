import React, { useState, useEffect } from "react";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import "./VideoFeed.css";
import { useAuth } from "../context/AuthContext";

export default function VideoFeed({ videos }) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  useEffect(() => {
    setCurrentVideo(videos[index]);
  }, [index, videos]);

  const handleOpenComments = () => {
    if (!user) return alert("Bạn cần đăng nhập để bình luận!");
    setShowComments(true);
  };

  const handleCloseComments = () => {
    setShowComments(false);
  };

  const handleLike = () => {
    if (!user) return alert("Bạn cần đăng nhập để like!");
    alert("Đã like video!");
  };

  if (!currentVideo) return null;

  return (
    <div className="videofeed-wrapper">

      <TwitterVideoPlayer
        videoUrl={currentVideo.url}
        autoPlayEnabled={true}
        onOpenComments={handleOpenComments}
        onLike={handleLike}
      />

      {showComments && (
        <CommentPanel video={currentVideo} onClose={handleCloseComments} />
      )}
    </div>
  );
}
