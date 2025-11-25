import React, { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { useAuth } from "../context/AuthContext";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import { supabase } from "../supabaseClient";
import "./VideoFeed.css";

export default function VideoFeed({ videos = [] }) {
  const { user } = useAuth();

  // ------------------------------
  // TAB STATE
  // ------------------------------
  const [tab, setTab] = useState("foryou"); // foryou | following | liked | search
  const [list, setList] = useState(videos);
  const [query, setQuery] = useState("");

  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showComments, setShowComments] = useState(false);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // reset index mỗi lần đổi danh sách video
  useEffect(() => {
    setList(videos);
  }, [videos]);

  useEffect(() => {
    setIndex(0);
    setCurrentVideo(list[0]);
  }, [list]);

  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [index, list]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
    // eslint-disable-next-line
  }, [currentVideo, user]);

  // -----------------------------------------
  // LOAD FOLLOWING VIDEOS
  // -----------------------------------------
  const loadFollowing = async () => {
    if (!user) {
      alert("Bạn cần đăng nhập!");
      return;
    }

    const { data, error } = await supabase
      .from("videos")
      .select(`
        *,
        profiles:profiles(id, username, avatar_url)
      `)
      .in(
        "user_id",
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
      );

    if (!error) {
      setList(data || []);
    }
  };

  // -----------------------------------------
  // LOAD LIKED VIDEOS
  // -----------------------------------------
  const loadLiked = async () => {
    if (!user) {
      alert("Bạn cần đăng nhập!");
      return;
    }

    const { data, error } = await supabase
      .from("likes")
      .select("video_id");

    if (error) return;

    const ids = (data || []).map((x) => x.video_id);

    if (ids.length === 0) {
      setList([]);
      return;
    }

    const { data: vids } = await supabase
      .from("videos")
      .select(`
        *,
        profiles:profiles(id, username, avatar_url)
      `)
      .in("id", ids);

    setList(vids || []);
  };

  // -----------------------------------------
  // SEARCH
  // -----------------------------------------
  const searchVideos = async () => {
    if (!query.trim()) return;

    const { data } = await supabase
      .from("videos")
      .select(`
        *,
        profiles:profiles(id, username, avatar_url)
      `)
      .or(`title.ilike.%${query}%,category.ilike.%${query}%`);

    setList(data || []);
  };

  // -----------------------------------------
  // VIDEO STATS (LIKE, COMMENTS, FOLLOW)
  // -----------------------------------------
  const loadStats = async () => {
    if (!currentVideo?.id) return;
    const videoId = currentVideo.id;

    try {
      // likes
      const { data: likesRows } = await supabase
        .from("likes")
        .select("*")
        .eq("video_id", videoId);
      setLikesCount(likesRows?.length || 0);

      // comments
      const { data: commentsRows } = await supabase
        .from("comments")
        .select("*")
        .eq("video_id", videoId);
      setCommentsCount(commentsRows?.length || 0);

      // đã like chưa?
      if (user) {
        const { data: myLike } = await supabase
          .from("likes")
          .select("*")
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsLiked(!!myLike);
      } else {
        setIsLiked(false);
      }

      // follow chưa?
      if (user && currentVideo.user_id) {
        const { data: f } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", user.id)
          .eq("following_id", currentVideo.user_id)
          .maybeSingle();
        setIsFollowing(!!f);
      } else {
        setIsFollowing(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // -----------------------------------------
  // LIKE / UNLIKE
  // -----------------------------------------
  const handleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập!");

    if (!isLiked) {
      await supabase.from("likes").insert({
        video_id: currentVideo.id,
        user_id: user.id,
      });
      setLikesCount((v) => v + 1);
      setIsLiked(true);
    } else {
      await supabase
        .from("likes")
        .delete()
        .eq("video_id", currentVideo.id)
        .eq("user_id", user.id);

      setLikesCount((v) => Math.max(0, v - 1));
      setIsLiked(false);
    }
  };

  // FOLLOW / UNFOLLOW
  const handleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập!");

    const target = currentVideo.user_id;
    if (!isFollowing) {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: target,
      });
      setIsFollowing(true);
    } else {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", target);
      setIsFollowing(false);
    }
  };

  // swipe
  const handlers = useSwipeable({
    onSwipedUp: () => index < list.length - 1 && setIndex(index + 1),
    onSwipedDown: () => index > 0 && setIndex(index - 1),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // -----------------------------------------
  // RENDER
  // -----------------------------------------
  return (
    <div className="videofeed-wrapper" {...handlers}>

      {/* ---------------------- */}
      {/* TOP TABS LIKE TIKTOK */}
      {/* ---------------------- */}
      <div className="top-tabs">
        <button
          className={tab === "foryou" ? "tab-active" : "tab"}
          onClick={() => {
            setTab("foryou");
            setList(videos);
          }}
        >
          For You
        </button>

        <button
          className={tab === "following" ? "tab-active" : "tab"}
          onClick={() => {
            setTab("following");
            loadFollowing();
          }}
        >
          Following
        </button>

        <button
          className={tab === "liked" ? "tab-active" : "tab"}
          onClick={() => {
            setTab("liked");
            loadLiked();
          }}
        >
          Liked
        </button>

        <div className="search-box">
          <input
            className="search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchVideos()}
          />
        </div>
      </div>

      {/* ---------------------- */}
      {/* MAIN VIDEO PLAYER */}
      {/* ---------------------- */}
      {currentVideo && (
        <>
          <TwitterVideoPlayer
            video={currentVideo}
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
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <img
                  src={currentVideo.profiles?.avatar_url || "/default-avatar.png"}
                  style={{ width: 40, height: 40, borderRadius: "50%" }}
                />
                <span>@{currentVideo.profiles?.username}</span>
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
        </>
      )}

      {showComments && (
        <CommentPanel
          video={currentVideo}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}
