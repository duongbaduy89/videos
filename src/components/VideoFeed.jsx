// src/components/VideoFeed.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, useAnimation } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import CommentPanel from "./CommentPanel";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import SearchPopup from "./SearchPopup";
import { supabase } from "../supabaseClient";
import "../styles/VideoFeed.css";

export default function VideoFeed({ videos = [] }) {
  const { user } = useAuth();

  const [tab, setTab] = useState("foryou");
  const [list, setList] = useState(videos || []);
  const [index, setIndex] = useState(0);
  const [currentVideo, setCurrentVideo] = useState(null);

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const searchQueryRef = useRef("");

  const [showComments, setShowComments] = useState(false);

  // refs & animation controls
  const containerRef = useRef(null);
  const yControls = useAnimation();
  const nextYControls = useAnimation();   // ⬅ video kế tiếp
  const isAnimatingRef = useRef(false);
  const lastWheelRef = useRef(0);

  // =======================================================
  // Notification helper
  // =======================================================
  const createNotification = async (type) => {
    if (!currentVideo || !user) return;
    if (currentVideo.user_id === user.id) return;

    await supabase.from("notifications").insert([
      {
        user_id: currentVideo.user_id,
        from_user_id: user.id,
        video_id: currentVideo.id,
        type,
        is_read: false,
      },
    ]);
  };

  // =======================================================
  // Initialize
  // =======================================================
  useEffect(() => {
    if (videos?.length && list.length === 0) {
      setList(videos);
      setIndex(0);
    }
  }, [videos]);

  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [index, list]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
  }, [currentVideo, user]);

  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("openSearchPopup", handler);
    return () => window.removeEventListener("openSearchPopup", handler);
  }, []);

  // =======================================================
  // Legacy swipe handlers (giữ nguyên)
  // =======================================================
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (list.length > 1) {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * list.length);
        } while (nextIndex === index);
        safeSetIndex(nextIndex);
      }
    },
    onSwipedDown: () => {
      if (list.length > 1) {
        let prevIndex;
        do {
          prevIndex = Math.floor(Math.random() * list.length);
        } while (prevIndex === index);
        safeSetIndex(prevIndex);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  const safeSetIndex = useCallback(
    (newIndex) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const normalized = ((newIndex % list.length) + list.length) % list.length;
      if (normalized === index) return;
      setIndex(normalized);
    },
    [index, list]
  );

  // =======================================================
  // Mouse wheel transition
  // =======================================================
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      const now = Date.now();
      if (now - lastWheelRef.current < 250) return;
      lastWheelRef.current = now;

      const delta = e.deltaY || e.wheelDelta || -e.detail;
      if (Math.abs(delta) < 2) return;

      if (delta > 0) triggerTransition("next");
      else triggerTransition("prev");
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [index, list]);

  // =======================================================
  // Transition handler (next/prev)
  // =======================================================
  const triggerTransition = useCallback(
    async (direction) => {
      if (!list || list.length <= 1) return;
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const height = containerRef.current?.clientHeight || window.innerHeight;
      const exitY = direction === "next" ? -height - 50 : height + 50;

      await yControls.start({
        y: exitY,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      setIndex((prev) => {
        return direction === "next"
          ? (prev + 1) % list.length
          : (prev - 1 + list.length) % list.length;
      });

      await yControls.set({
        y: direction === "next" ? height + 50 : -height - 50,
      });

      await nextYControls.set({ y: "100%" }); // reset preview

      await yControls.start({
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      isAnimatingRef.current = false;
    },
    [list, yControls, nextYControls]
  );

  // =======================================================
  // ★ TikTok partial reveal – reveal video tiếp theo khi đang kéo
  // =======================================================
  const onDrag = (event, info) => {
    const offsetY = info.offset.y;
    const height = containerRef.current?.clientHeight || window.innerHeight;

    // kéo lên → hiện video kế tiếp
    if (offsetY < 0 && list.length > 1) {
      const reveal = Math.min(Math.abs(offsetY), height);
      nextYControls.set({ y: height - reveal });
    }

    // kéo xuống → hiện video trước
    if (offsetY > 0 && list.length > 1) {
      const reveal = Math.min(offsetY, height);
      nextYControls.set({ y: -height + reveal });
    }
  };

  // =======================================================
  // DragEnd: decide transition or snap back
  // =======================================================
  const onDragEnd = async (event, info) => {
    if (isAnimatingRef.current) return;

    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;

    const THRESHOLD = 140;
    const VEL_THRESHOLD = 800;

    if (offsetY < -THRESHOLD || velocityY < -VEL_THRESHOLD) {
      await triggerTransition("next");
    } else if (offsetY > THRESHOLD || velocityY > VEL_THRESHOLD) {
      await triggerTransition("prev");
    } else {
      // snap back current
      await yControls.start({
        y: 0,
        transition: { type: "spring", stiffness: 400, damping: 40 },
      });

      // snap back next/prev preview
      await nextYControls.start({
        y: "100%",
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });
    }
  };

  // =======================================================
  // Fetch helpers
  // =======================================================
  const updateList = (newList) => {
    if (!newList?.length) {
      setList([]);
      setIndex(0);
      return;
    }
    if (newList !== list) {
      setList(newList);
      setIndex(0);
    }
  };

  const fetchForYou = async () => {
    if (videos?.length) {
      updateList(videos);
      return;
    }
    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .order("created_at", { ascending: false });
    updateList(data);
  };

  const fetchFollowing = async () => {
    if (!user) return updateList([]);

    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const ids = follows?.map((x) => x.following_id) || [];
    if (!ids.length) return updateList([]);

    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    updateList(data);
  };

  const fetchLiked = async () => {
    if (!user) return updateList([]);

    const { data: likes } = await supabase
      .from("likes")
      .select("video_id")
      .eq("user_id", user.id);

    const ids = likes?.map((x) => x.video_id) || [];
    if (!ids.length) return updateList([]);

    const { data } = await supabase
      .from("videos")
      .select("*, profiles:profiles(id,username,avatar_url)")
      .in("id", ids)
      .order("created_at", { ascending: false });

    updateList(data);
  };

  useEffect(() => {
    if (tab === "foryou") fetchForYou();
    if (tab === "following") fetchFollowing();
    if (tab === "liked") fetchLiked();
  }, [tab, user]);

  // =======================================================
  // Load stats
  // =======================================================
  const loadStats = async () => {
    if (!currentVideo?.id) return;

    const vid = currentVideo.id;

    const { data: lk } = await supabase.from("likes").select("*").eq("video_id", vid);
    setLikesCount(lk?.length || 0);

    const { data: cm } = await supabase.from("comments").select("*").eq("video_id", vid);
    setCommentsCount(cm?.length || 0);

    if (user) {
      const { data: my } = await supabase
        .from("likes")
        .select("*")
        .eq("video_id", vid)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsLiked(!!my);

      const { data: f } = await supabase
        .from("follows")
        .select("*")
        .eq("follower_id", user.id)
        .eq("following_id", currentVideo.user_id)
        .maybeSingle();
      setIsFollowing(!!f);
    } else {
      setIsLiked(false);
      setIsFollowing(false);
    }
  };

  const toggleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like");

    if (!isLiked) {
      await supabase.from("likes").insert({ video_id: currentVideo.id, user_id: user.id });
      await createNotification("like");
      setLikesCount((x) => x + 1);
      setIsLiked(true);
    } else {
      await supabase
        .from("likes")
        .delete()
        .eq("video_id", currentVideo.id)
        .eq("user_id", user.id);
      setLikesCount((x) => Math.max(0, x - 1));
      setIsLiked(false);
    }
  };

  const toggleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow");

    if (!isFollowing) {
      await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: currentVideo.user_id });
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

  // =======================================================
  // Reset animation when video changes
  // =======================================================
  useEffect(() => {
    yControls.set({ y: 0 });
    nextYControls.set({ y: "100%" });  // reset preview
    isAnimatingRef.current = false;
  }, [index]);

  // =======================================================
  // RENDER
  // =======================================================
  return (
    <div className="videofeed-root" {...handlers} ref={containerRef}>
      {/* Tabs */}
      <div className="overlay-tabs">
        <div
          className={`otab ${tab === "following" ? "active" : ""}`}
          onClick={() => setTab("following")}
        >
          Following
        </div>
        <div
          className={`otab ${tab === "foryou" ? "active" : ""}`}
          onClick={() => setTab("foryou")}
        >
          For You
        </div>
        <div
          className={`otab ${tab === "liked" ? "active" : ""}`}
          onClick={() => setTab("liked")}
        >
          Liked
        </div>
      </div>

      {/* Viewport */}
      <div className="videofeed-viewport">
        {currentVideo ? (
          <>
            {/* ★ VIDEO KẾ TIẾP – nằm dưới, để reveal */}
            {list.length > 1 && (
              <motion.div
                key={"next-" + index}
                className="motion-next-video"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                }}
                animate={nextYControls}
                initial={{ y: "100%" }}
              >
                <TwitterVideoPlayer
                  video={list[(index + 1) % list.length]}
                  videoUrl={list[(index + 1) % list.length].url}
                  autoPlayEnabled={false}
                />
              </motion.div>
            )}

            {/* VIDEO HIỆN TẠI */}
            <motion.div
              key={currentVideo.id}
              className="motion-video-wrapper"
              style={{
                height: "100%",
                width: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.16}
              onDrag={onDrag}     // ★ thêm partial reveal
              onDragEnd={onDragEnd}
              animate={yControls}
              whileTap={{ cursor: "grabbing" }}
            >
              <TwitterVideoPlayer
                key={currentVideo.id}
                video={currentVideo}
                videoUrl={currentVideo.url}
                autoPlayEnabled={true}
                liked={isLiked}
                onLike={toggleLike}
                onOpenComments={() => setShowComments(true)}
              />
            </motion.div>

            {/* OVERLAY UI */}
            <div className="info-overlay">
              <div className="author-row">
                <a href={`/profile/${currentVideo.user_id}`} className="author-link">
                  <img
                    src={currentVideo.profiles?.avatar_url || "/default-avatar.png"}
                    className="author-avatar"
                    alt="avatar"
                  />
                  <div className="author-meta">
                    <div className="author-name">@{currentVideo.profiles?.username}</div>
                    <div className="video-cat">{currentVideo.category}</div>
                  </div>
                </a>

                <button
                  className={`follow-action ${isFollowing ? "following" : ""}`}
                  onClick={toggleFollow}
                >
                  {isFollowing ? "Đang Follow" : "Follow"}
                </button>
              </div>

              <div className="title-desc">
                <div className="video-title">{currentVideo.title}</div>
                <div className="video-desc">{currentVideo.description}</div>
              </div>

              <div className="bottom-stats">
                <span
                  className={`like-count ${isLiked ? "liked" : ""}`}
                  onClick={toggleLike}
                >
                  ❤️ {likesCount}
                </span>
                <span className="comment-count" onClick={() => setShowComments(true)}>
                  💬 {commentsCount}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Không có video để hiển thị</div>
        )}
      </div>

      {showComments && currentVideo && (
        <CommentPanel video={currentVideo} onClose={() => setShowComments(false)} />
      )}

      <SearchPopup
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(query) => {
          searchQueryRef.current = query;
          if (!query.trim()) return;
          const pattern = `%${query}%`;
          supabase
            .from("videos")
            .select("*, profiles:profiles(id,username,avatar_url)")
            .or(`title.ilike.${pattern},category.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .then(({ data }) => {
              updateList(data);
              setTab("foryou");
            });
        }}
        initial={searchQueryRef.current}
      />
    </div>
  );
}
