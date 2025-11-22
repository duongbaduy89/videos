import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { useAuth } from "../context/AuthContext";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import { supabase } from "../supabaseClient";
import "./VideoFeed.css";

export default function VideoFeed({ videos }) {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showComments, setShowComments] = useState(false);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // load video khi index đổi
  useEffect(() => {
    const v = videos[index];
    setCurrentVideo(v);
    if (v) loadStats(v.id);
  }, [index, videos]);

  // Tải stats từ DB
  const loadStats = async (videoId) => {
    if (!videoId) return;

    // like count
    let { data: likes } = await supabase
      .from("video_likes")
      .select("*", { count: "exact" })
      .eq("video_id", videoId);

    setLikesCount(likes?.length || 0);

    // comment count
    let { data: comments } = await supabase
      .from("comments")
      .select("*", { count: "exact" })
      .eq("video_id", videoId);

    setCommentsCount(comments?.length || 0);

    // user liked?
    if (user) {
      let { data: mylike } = await supabase
        .from("video_likes")
        .select("*")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsLiked(!!mylike);
    }

    // user follow?
    if (user && currentVideo?.user_id) {
      let { data: myf } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id)
        .maybeSingle();

      setIsFollowing(!!myf);
    }
  };

  // LIKE / UNLIKE
  const handleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like!");

    if (!isLiked) {
      await supabase.from("video_likes").insert([
        { video_id: currentVideo.id, user_id: user.id },
      ]);
      setLikesCount(likesCount + 1);
      setIsLiked(true);
    } else {
      await supabase
        .from("video_likes")
        .delete()
        .eq("video_id", currentVideo.id)
        .eq("user_id", user.id);

      setLikesCount(likesCount - 1);
      setIsLiked(false);
    }
  };

  // FOLLOW
  const handleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow!");

    if (!isFollowing) {
      await supabase.from("follows").insert([
        {
          follower_id: user.id,
          following_id: currentVideo.user_id,
        },
      ]);
      setIsFollowing(true);
    } else {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id);

      setIsFollowing(false);
    }
  };

  const handlers = useSwipeable({
    onSwipedUp: () => index < videos.length - 1 && setIndex(index + 1),
    onSwipedDown: () => index > 0 && setIndex(index - 1),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  if (!currentVideo) return null;

  return (
    <div className="videofeed-wrapper" {...handlers}>
      <TwitterVideoPlayer
        videoUrl={currentVideo.url}
        autoPlayEnabled={true}
        onOpenComments={() => {
          if (!user) return alert("Bạn cần đăng nhập để bình luận!");
          setShowComments(true);
        }}
        onLike={handleLike}
        liked={isLiked}
      />

      {/* ==== UI dưới video ==== */}
      <div className="video-info-box">
        <div className="user-row">
          <span className="username">
            @{currentVideo.username || "unknown"}
          </span>

          <button
            className="follow-btn"
            onClick={handleFollow}
            style={{
              background: isFollowing ? "#555" : "#ff0050",
            }}
          >
            {isFollowing ? "Đang Follow" : "Follow"}
          </button>
        </div>

        <div className="video-title">{currentVideo.title}</div>

        <div className="video-desc">
          {currentVideo.description?.slice(0, 80)}
        </div>

        <div className="video-stats">
          <span style={{ color: isLiked ? "red" : "white" }}>
            ❤️ {likesCount}
          </span>
          <span style={{ marginLeft: 15 }}>💬 {commentsCount}</span>
        </div>
      </div>

      {showComments && (
        <CommentPanel
          video={currentVideo}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
