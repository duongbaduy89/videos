import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import "./VideoFeed.css";
import { useAuth } from "../context/AuthContext";

export default function VideoFeed({ videos }) {
  const { user } = useAuth();

  const [index, setIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);

  // Khi index thay đổi → load video mới
  useEffect(() => {
    setCurrentVideo(videos[index]);
  }, [index, videos]);

  // Mở form comment
  const handleOpenComments = () => {
    if (!user) return alert("Bạn cần đăng nhập để bình luận!");
    setShowComments(true);
  };

  const handleCloseComments = () => {
    setShowComments(false);
  };

  // Xử lý Like
  const handleLike = () => {
    if (!user) return alert("Bạn cần đăng nhập để like!");
    alert("Đã like video!");
  };

  // ============================
  // 🔥 SWIPE LIKE TIKTOK
  // ============================
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (index < videos.length - 1) {
        setIndex(index + 1);
      }
    },
    onSwipedDown: () => {
      if (index > 0) {
        setIndex(index - 1);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
  });

  if (!currentVideo) return null;

  return (
    <div className="videofeed-wrapper" {...handlers}>
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
