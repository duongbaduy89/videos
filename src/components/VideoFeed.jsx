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

  useEffect(() => {
    setCurrentVideo(videos[index]);
  }, [index, videos]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
  }, [currentVideo]);

  const loadStats = async () => {
    const videoId = currentVideo.id;

    let { data: likes } = await supabase
      .from("video_likes")
      .select("*")
      .eq("video_id", videoId);
    setLikesCount(likes?.length || 0);

    let { data: comments } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId);
    setCommentsCount(comments?.length || 0);

    if (user) {
      let { data: mylike } = await supabase
        .from("video_likes")
        .select("*")
        .eq("video_id", videoId)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsLiked(!!mylike);
    }

    if (user && currentVideo?.user_id) {
      let { data: f } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id)
        .maybeSingle();
      setIsFollowing(!!f);
    }
  };

  const handleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like!");
    if (!currentVideo?.id) return;

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

  const handleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow!");
    if (!currentVideo?.user_id) return;

    const targetUser = currentVideo.user_id;

    if (!isFollowing) {
      await supabase.from("follows").insert([
        { follower_id: user.id, following_id: targetUser },
      ]);

      await supabase.rpc("increment_followers", { user_id: targetUser });
      await supabase.rpc("increment_following", { user_id: user.id });

      setIsFollowing(true);
    } else {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUser);

      await supabase.rpc("decrement_followers", { user_id: targetUser });
      await supabase.rpc("decrement_following", { user_id: user.id });

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

      <div className="video-info-box">
        <div className="user-row">
          <a
            href={`/profile/${currentVideo.user_id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "white",
            }}
          >
            <img
              src={currentVideo.profiles?.avatar_url || "/default-avatar.png"}
              style={{ width: 40, height: 40, borderRadius: "50%" }}
            />
            <span>@{currentVideo.profiles?.username || "unknown"}</span>
          </a>

          <button
            className="follow-btn"
            onClick={handleFollow}
            style={{ background: isFollowing ? "#555" : "#ff0050" }}
          >
            {isFollowing ? "Đang Follow" : "Follow"}
          </button>
        </div>

        <div className="video-title">{currentVideo.title}</div>
        <div className="video-desc">{currentVideo.description?.slice(0, 80)}</div>

        <div className="video-stats">
          <span style={{ color: isLiked ? "red" : "white" }}>❤️ {likesCount}</span>
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
