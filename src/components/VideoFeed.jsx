import React, { useState, useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { useAuth } from "../context/AuthContext";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import SearchPopup from "./SearchPopup";
import { supabase } from "../supabaseClient";
import "../styles/VideoFeed.css";

export default function VideoFeed({ videos = [] }) {
  const { user } = useAuth();

  const [tab, setTab] = useState("foryou");
  const [list, setList] = useState([]);
  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchQueryRef = useRef("");

  const [showComments, setShowComments] = useState(false);

  // -----------------------------
  // SAFETY FILTER
  // -----------------------------
  const filterValidVideos = (arr) =>
    (arr || []).filter((v) => v && v.user_id && v.id);

  // -----------------------------
  // Initial
  // -----------------------------
  useEffect(() => {
    if (videos?.length > 0) {
      setList(filterValidVideos(videos));
    }
  }, [videos]);

  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [index, list]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
  }, [currentVideo, user]);

  // Receive search popup event
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("openSearchPopup", handler);
    return () => window.removeEventListener("openSearchPopup", handler);
  }, []);

  // -----------------------------
  // FETCH FOR YOU
  // -----------------------------
  const fetchForYou = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .order("created_at", { ascending: false });

    setList(filterValidVideos(data));
    setIndex(0);
  };

  const fetchForYouOrUseList = async () => {
    if (videos.length > 0) {
      setList(filterValidVideos(videos));
      setIndex(0);
      return;
    }
    await fetchForYou();
  };

  // -----------------------------
  // FETCH FOLLOWING
  // -----------------------------
  const fetchFollowing = async () => {
    if (!user) {
      setList([]);
      return;
    }

    const { data: f } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const ids = (f || []).map((x) => x.following_id).filter(Boolean);

    if (ids.length === 0) {
      setList([]);
      return;
    }

    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    setList(filterValidVideos(data));
    setIndex(0);
  };

  // -----------------------------
  // FETCH LIKED
  // -----------------------------
  const fetchLiked = async () => {
    if (!user) {
      setList([]);
      return;
    }

    const { data: l } = await supabase
      .from("likes")
      .select("video_id")
      .eq("user_id", user.id);

    const ids = (l || []).map((x) => x.video_id).filter(Boolean);

    if (ids.length === 0) {
      setList([]);
      return;
    }

    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("id", ids)
      .order("created_at", { ascending: false });

    setList(filterValidVideos(data));
    setIndex(0);
  };

  // -----------------------------
  // SEARCH
  // -----------------------------
  const doSearch = async (q) => {
    if (!q.trim()) return;
    const pattern = `%${q}%`;

    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .or(`title.ilike.${pattern},category.ilike.${pattern}`)
      .order("created_at", { ascending: false });

    setList(filterValidVideos(data));
    setIndex(0);
    setTab("foryou");
  };

  // -----------------------------
  // LOAD STATS
  // -----------------------------
  const loadStats = async () => {
    const vid = currentVideo.id;

    const { data: likes } = await supabase
      .from("likes")
      .select("*")
      .eq("video_id", vid);

    const { data: cm } = await supabase
      .from("comments")
      .select("*")
      .eq("video_id", vid);

    setLikesCount(likes?.length || 0);
    setCommentsCount(cm?.length || 0);

    if (user) {
      const { data: my } = await supabase
        .from("likes")
        .select("*")
        .eq("video_id", vid)
        .eq("user_id", user.id)
        .maybeSingle();

      setIsLiked(!!my);
    } else setIsLiked(false);

    if (user && currentVideo.user_id) {
      const { data: fl } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id)
        .maybeSingle();

      setIsFollowing(!!fl);
    } else setIsFollowing(false);
  };

  // -----------------------------
  // LIKE / FOLLOW
  // -----------------------------
  const toggleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập");

    if (isLiked) {
      await supabase
        .from("likes")
        .delete()
        .eq("video_id", currentVideo.id)
        .eq("user_id", user.id);

      setIsLiked(false);
      setLikesCount((x) => Math.max(0, x - 1));
    } else {
      await supabase.from("likes").insert({
        video_id: currentVideo.id,
        user_id: user.id,
      });

      setIsLiked(true);
      setLikesCount((x) => x + 1);
    }
  };

  const toggleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập");

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id);

      setIsFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: currentVideo.user_id,
      });

      setIsFollowing(true);
    }
  };

  // -----------------------------
  // SWIPE
  // -----------------------------
  const handlers = useSwipeable({
    onSwipedUp: () =>
      index < list.length - 1 && setIndex(index + 1),
    onSwipedDown: () =>
      index > 0 && setIndex(index - 1),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // -----------------------------
  // TAB CHANGE
  // -----------------------------
  useEffect(() => {
    if (tab === "foryou") fetchForYouOrUseList();
    if (tab === "following") fetchFollowing();
    if (tab === "liked") fetchLiked();
  }, [tab]);

  useEffect(() => {
    fetchForYouOrUseList();
  }, []);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="videofeed-root" {...handlers}>
      <div className="overlay-tabs">
        <div className={`otab ${tab === "following" ? "active" : ""}`} onClick={() => setTab("following")}>Following</div>
        <div className={`otab ${tab === "foryou" ? "active" : ""}`} onClick={() => setTab("foryou")}>For You</div>
        <div className={`otab ${tab === "liked" ? "active" : ""}`} onClick={() => setTab("liked")}>Liked</div>
      </div>

      <div className="videofeed-viewport">
        {currentVideo ? (
          <>
            <TwitterVideoPlayer
              video={currentVideo}
              videoUrl={currentVideo.url}
              autoPlayEnabled={true}
              liked={isLiked}
              onLike={toggleLike}
              onOpenComments={() => setShowComments(true)}
            />

            <div className="info-overlay">
              <div className="author-row">
                <a href={`/profile/${currentVideo.user_id}`} className="author-link">
                  <img src={currentVideo.profiles?.avatar_url || "/default-avatar.png"} className="author-avatar" />
                  <div className="author-meta">
                    <div className="author-name">@{currentVideo.profiles?.username}</div>
                    <div className="video-cat">{currentVideo.category}</div>
                  </div>
                </a>

                <button className={`follow-action ${isFollowing ? "following" : ""}`} onClick={toggleFollow}>
                  {isFollowing ? "Đang Follow" : "Follow"}
                </button>
              </div>

              <div className="title-desc">
                <div className="video-title">{currentVideo.title}</div>
                <div className="video-desc">{currentVideo.description}</div>
              </div>

              <div className="bottom-stats">
                <span className={`like-count ${isLiked ? "liked" : ""}`} onClick={toggleLike}>
                  ❤️ {likesCount}
                </span>
                <span className="comment-count" onClick={() => setShowComments(true)}>
                  💬 {commentsCount}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Không có video</div>
        )}
      </div>

      {showComments && currentVideo && <CommentPanel video={currentVideo} onClose={() => setShowComments(false)} />}

      <SearchPopup
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={doSearch}
        initial={searchQueryRef.current}
      />
    </div>
  );
}
