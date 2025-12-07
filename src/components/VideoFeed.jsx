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
import { useLocation, useNavigate } from "react-router-dom";
import PhotoPost from "./PhotoPost"; // NEW - component to render photo posts

export default function VideoFeed({ videos = [] }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  // --- jump target from query params
  const [jumpTarget, setJumpTarget] = useState({ id: null, openComments: false });

  // refs & animation controls
  const containerRef = useRef(null);
  const yControls = useAnimation();
  const nextControls = useAnimation();
  const isAnimatingRef = useRef(false);
  const lastWheelRef = useRef(0);
  const nextRef = useRef(null);

  // ------------------ Notification helper ------------------
  const createNotification = async (type) => {
    if (!currentVideo || !user) return;
    // Don't notify for self actions
    if (currentVideo.user_id === user.id) return;

    // Notification structure: for both video and photo we pass video_id OR photo_id as applicable.
    try {
      await supabase.from("notifications").insert([
        {
          user_id: currentVideo.user_id,
          from_user_id: user.id,
          video_id: currentVideo.type === "video" ? currentVideo.id : null,
          comment_id: null,
          type,
          is_read: false,
        },
      ]);
    } catch (err) {
      console.error("createNotification err:", err);
    }
  };

  // ----------------- Initialize -----------------
  useEffect(() => {
    if (videos?.length && (!list || list.length === 0)) {
      // normalize incoming videos as type 'video'
      const v = (videos || []).map((vid) => ({ ...vid, type: "video" }));
      setList(v);
      setIndex(0);
    }
  }, [videos]);

  useEffect(() => {
    setCurrentVideo(list[index]);
  }, [index, list]);

  useEffect(() => {
    if (currentVideo?.id) loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo, user]);

  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("openSearchPopup", handler);
    return () => window.removeEventListener("openSearchPopup", handler);
  }, []);

  // ----------------- Parse query params for jump
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vid = params.get("video");
    const openComments = params.get("openComments") === "true";
    if (vid) {
      setJumpTarget({ id: vid, openComments });
    } else {
      setJumpTarget({ id: null, openComments: false });
    }
  }, [location.search]);

  // ----------------- When list changes, perform jump if requested
  useEffect(() => {
    const targetId = jumpTarget.id;
    if (!targetId) return;
    if (!list || list.length === 0) return;

    const foundIndex = list.findIndex((v) => v.id === targetId);
    if (foundIndex !== -1) {
      // set index to found
      setIndex(foundIndex);

      // open comment panel if requested
      if (jumpTarget.openComments) {
        setTimeout(() => setShowComments(true), 180);
      }

      navigate(location.pathname, { replace: true });
      setJumpTarget({ id: null, openComments: false });
    } else {
      // If not found, attempt to fetch as video first, then photo
      (async () => {
        try {
          // try video
          let { data: vdata } = await supabase
            .from("videos")
            .select("*, profiles:profiles(id,username,avatar_url)")
            .eq("id", targetId)
            .maybeSingle();

          if (vdata) {
            setList((prev) => {
              const exists = (prev || []).some((p) => p.id === vdata.id);
              if (exists) return prev;
              return [{ ...vdata, type: "video" }, ...(prev || [])];
            });
            setTimeout(() => {
              setIndex(0);
              if (jumpTarget.openComments) setShowComments(true);
              navigate(location.pathname, { replace: true });
              setJumpTarget({ id: null, openComments: false });
            }, 160);
            return;
          }

          // try photo
          let { data: pdata } = await supabase
            .from("photos")
            .select("*, profiles:profiles(id,username,avatar_url)")
            .eq("id", targetId)
            .maybeSingle();

          if (pdata) {
            setList((prev) => {
              const exists = (prev || []).some((p) => p.id === pdata.id);
              if (exists) return prev;
              return [{ ...normalizePhotoRow(pdata) }, ...(prev || [])];
            });
            setTimeout(() => {
              setIndex(0);
              if (jumpTarget.openComments) setShowComments(true);
              navigate(location.pathname, { replace: true });
              setJumpTarget({ id: null, openComments: false });
            }, 160);
            return;
          }

          // nothing found
          navigate(location.pathname, { replace: true });
          setJumpTarget({ id: null, openComments: false });
        } catch (err) {
          console.error("fetch single item error", err);
          navigate(location.pathname, { replace: true });
          setJumpTarget({ id: null, openComments: false });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, jumpTarget]);

  // ----------------- Legacy swipe handlers (preserve random behavior) -----------------
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (list.length > 1) {
        let r;
        do {
          r = Math.floor(Math.random() * list.length);
        } while (r === index);
        safeSetIndex(r);
      }
    },
    onSwipedDown: () => {
      if (list.length > 1) {
        let r;
        do {
          r = Math.floor(Math.random() * list.length);
        } while (r === index);
        safeSetIndex(r);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // ----------------- Safe index setter -----------------
  const safeSetIndex = useCallback(
    (newIndex) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const normalized = ((newIndex % list.length) + list.length) % list.length;
      if (normalized === index) return;
      setIndex(normalized);
    },
    [index, list]
  );

  // ----------------- Wheel handler (throttled) -----------------
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

  // ----------------- Transition logic -----------------
  const triggerTransition = useCallback(
    async (direction) => {
      if (!list || list.length <= 1) return;
      if (isAnimatingRef.current) return;
      isAnimatingRef.current = true;

      const height = containerRef.current?.clientHeight || window.innerHeight;
      const exitY = direction === "next" ? -height - 50 : height + 50;

      await yControls.start({
        y: exitY,
        opacity: 0.8,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      // RANDOM INDEX HERE
      setIndex((prev) => {
        let r;
        do {
          r = Math.floor(Math.random() * list.length);
        } while (r === prev);
        return r;
      });

      await yControls.set({
        y: direction === "next" ? height + 50 : -height - 50,
        opacity: 1,
      });

      await nextControls.set({ y: "100%", opacity: 0, scale: 0.95 });

      await yControls.start({
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      nextRef.current?.classList.remove("revealed");
      isAnimatingRef.current = false;
    },
    [list, yControls, nextControls]
  );

  // ----------------- FIXED onDrag (FULL SYNC) -----------------
  const onDrag = (event, info) => {
    const offsetY = info.offset.y;
    const height = containerRef.current?.clientHeight || window.innerHeight;
    const progress = Math.min(Math.abs(offsetY) / height, 1);

    const nextOpacityVal = 0.4 + progress * 0.6;
    const nextScaleVal = 0.95 + progress * 0.05;
    const currentOpacityVal = 1 - progress * 0.4;

    yControls.set({
      y: offsetY,
      opacity: currentOpacityVal,
    });

    nextControls.set({
      y: height + offsetY,
      opacity: nextOpacityVal,
      scale: nextScaleVal,
    });

    if (offsetY < -40) nextRef.current?.classList.add("revealed");
    else nextRef.current?.classList.remove("revealed");
  };

  // ----------------- DragEnd -----------------
  const onDragEnd = async (event, info) => {
    if (isAnimatingRef.current) return;

    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;
    const height = containerRef.current?.clientHeight || window.innerHeight;

    // MORE SENSITIVE
    const THRESHOLD = 70;
    const VEL_THRESHOLD = 250;

    if (offsetY < -THRESHOLD || velocityY < -VEL_THRESHOLD) {
      await triggerTransition("next");
      return;
    }

    if (offsetY > THRESHOLD || velocityY > VEL_THRESHOLD) {
      await triggerTransition("prev");
      return;
    }

    await yControls.start({
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 40 },
    });

    await nextControls.start({
      y: height,
      opacity: 0,
      scale: 0.95,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    });

    nextRef.current?.classList.remove("revealed");
  };

  // ----------------- Helpers for feed fetching & normalization -----------------
  const normalizePhotoRow = (p) => {
    // p.url might be a JSON array string or a single string
    let urlVal = p.url;
    try {
      if (typeof urlVal === "string" && urlVal.trim().startsWith("[")) {
        const parsed = JSON.parse(urlVal);
        if (Array.isArray(parsed)) urlVal = parsed;
      }
    } catch (e) {
      // ignore parse error
    }
    return { ...p, type: "photo", url: urlVal };
  };

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

  const fetchFeedItems = async ({ mode }) => {
    try {
      // Default queries
      let vidQuery = supabase
        .from("videos")
        .select("*, profiles:profiles(id,username,avatar_url)");
      let photoQuery = supabase
        .from("photos")
        .select("*, profiles:profiles(id,username,avatar_url)");

      if (mode === "following") {
        if (!user) {
          updateList([]);
          return;
        }
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const ids = follows?.map((x) => x.following_id) || [];
        if (!ids.length) {
          updateList([]);
          return;
        }

        vidQuery = vidQuery.in("user_id", ids);
        photoQuery = photoQuery.in("user_id", ids);
      }

      if (mode === "liked") {
        if (!user) {
          updateList([]);
          return;
        }

        // we expect likes table possibly references video_id and/or photo_id
        const { data: likes } = await supabase
          .from("likes")
          .select("video_id, photo_id")
          .eq("user_id", user.id);

        const videoIds = (likes || []).map((l) => l.video_id).filter(Boolean);
        const photoIds = (likes || []).map((l) => l.photo_id).filter(Boolean);

        const [vidRes, photoRes] = await Promise.all([
          videoIds.length
            ? supabase
                .from("videos")
                .select("*, profiles:profiles(id,username,avatar_url)")
                .in("id", videoIds)
            : { data: [] },
          photoIds.length
            ? supabase
                .from("photos")
                .select("*, profiles:profiles(id,username,avatar_url)")
                .in("id", photoIds)
            : { data: [] },
        ]);

        const videoItems = (vidRes.data || []).map((v) => ({ ...v, type: "video" }));
        const photoItems = (photoRes.data || []).map((p) => normalizePhotoRow(p));

        const merged = [...videoItems, ...photoItems].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        updateList(merged);
        return;
      }

      // For "foryou" and default
      const [vRes, pRes] = await Promise.all([
        vidQuery.order("created_at", { ascending: false }),
        photoQuery.order("created_at", { ascending: false }),
      ]);

      const videoItems = (vRes.data || []).map((v) => ({ ...v, type: "video" }));
      const photoItems = (pRes.data || []).map((p) => normalizePhotoRow(p));

      const merged = [...videoItems, ...photoItems].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      updateList(merged);
    } catch (err) {
      console.error("fetchFeedItems err", err);
      updateList([]);
    }
  };

  // ----------------- Tab effect -----------------
  useEffect(() => {
    fetchFeedItems({ mode: tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user]);

  // ----------------- Stats (works for video & photo) -----------------
  const loadStats = async () => {
    if (!currentVideo?.id) return;
    const id = currentVideo.id;
    const idField = currentVideo.type === "video" ? "video_id" : "photo_id";

    try {
      // likes
      const { data: lk } = await supabase
        .from("likes")
        .select("*")
        .eq(idField, id);

      setLikesCount(lk?.length || 0);

      // comments: expecting comments table may contain video_id/photo_id columns
      const { data: cm } = await supabase
        .from("comments")
        .select("*")
        .eq(idField, id);

      setCommentsCount(cm?.length || 0);

      if (user) {
        const { data: my } = await supabase
          .from("likes")
          .select("*")
          .eq(idField, id)
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
    } catch (err) {
      console.error("loadStats err:", err);
      setLikesCount(0);
      setCommentsCount(0);
      setIsLiked(false);
      setIsFollowing(false);
    }
  };

  const toggleLike = async () => {
    if (!user) return alert("Bạn cần đăng nhập để like");
    const id = currentVideo.id;
    const idField = currentVideo.type === "video" ? "video_id" : "photo_id";

    try {
      if (!isLiked) {
        const insertObj = { user_id: user.id };
        insertObj[idField] = id;
        await supabase.from("likes").insert(insertObj);
        await createNotification("like");
        setLikesCount((x) => x + 1);
        setIsLiked(true);
      } else {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq(idField, id);
        setLikesCount((x) => Math.max(0, x - 1));
        setIsLiked(false);
      }
    } catch (err) {
      console.error("toggleLike err:", err);
    }
  };

  const toggleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow");

    try {
      if (!isFollowing) {
        await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            following_id: currentVideo.user_id,
          });
        setIsFollowing(true);
      } else {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", currentVideo.user_id);

        setIsFollowing(false);
      }
    } catch (err) {
      console.error("toggleFollow err:", err);
    }
  };

  // reset animations when index changes
  useEffect(() => {
    const height = containerRef.current?.clientHeight || window.innerHeight;
    yControls.set({ y: 0, opacity: 1 });
    nextControls.set({ y: height, opacity: 0, scale: 0.95 });
    nextRef.current?.classList.remove("revealed");
    isAnimatingRef.current = false;
  }, [index]);

  // ----------------- Render -----------------
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
            {/* NEXT ITEM PREVIEW */}
            {list.length > 1 && (
              <motion.div
                key={"next-" + index}
                className="motion-next-video"
                ref={nextRef}
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={nextControls}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 0,
                }}
              >
                {/* preview next item: respect type */}
                {list[(index + 1) % list.length]?.type === "video" ? (
                  <TwitterVideoPlayer
                    video={list[(index + 1) % list.length]}
                    videoUrl={list[(index + 1) % list.length].url}
                    autoPlayEnabled={false}
                  />
                ) : (
                  <PhotoPost item={list[(index + 1) % list.length]} />
                )}
              </motion.div>
            )}

            {/* CURRENT ITEM (video or photo) */}
            <motion.div
              key={currentVideo.id}
              className="motion-video-wrapper"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.08}
              dragTransition={{ power: 0.15, timeConstant: 120 }}
              onDrag={onDrag}
              onDragEnd={onDragEnd}
              animate={yControls}
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
              whileTap={{ cursor: "grabbing" }}
            >
              {currentVideo.type === "video" ? (
                <TwitterVideoPlayer
                  key={currentVideo.id}
                  video={currentVideo}
                  videoUrl={currentVideo.url}
                  autoPlayEnabled={true}
                  liked={isLiked}
                  onLike={toggleLike}
                  onOpenComments={() => setShowComments(true)}
                />
              ) : (
                <PhotoPost
                  item={currentVideo}
                  onLike={() => toggleLike()}
                  onOpenComments={() => setShowComments(true)}
                  onFollow={() => toggleFollow()}
                />
              )}
            </motion.div>

            {/* OVERLAY UI */}
            <div className="info-overlay">
              <div className="author-row">
                <a
                  href={`/profile/${currentVideo.user_id}`}
                  className="author-link"
                >
                  <img
                    src={
                      currentVideo.profiles?.avatar_url || "/default-avatar.png"
                    }
                    className="author-avatar"
                    alt="avatar"
                  />
                  <div className="author-meta">
                    <div className="author-name">
                      @{currentVideo.profiles?.username}
                    </div>
                    <div className="video-cat">
                      {currentVideo.category || (currentVideo.type === "photo" ? "photo" : "")}
                    </div>
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
                <span
                  className="comment-count"
                  onClick={() => setShowComments(true)}
                >
                  💬 {commentsCount}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Không có nội dung để hiển thị</div>
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

          // search videos and photos by title/description/category
          Promise.all([
            supabase
              .from("videos")
              .select("*, profiles:profiles(id,username,avatar_url)")
              .or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`)
              .order("created_at", { ascending: false }),
            supabase
              .from("photos")
              .select("*, profiles:profiles(id,username,avatar_url)")
              .or(`title.ilike.${pattern},description.ilike.${pattern}`)
              .order("created_at", { ascending: false }),
          ])
            .then(([vRes, pRes]) => {
              const videoItems = (vRes.data || []).map((v) => ({ ...v, type: "video" }));
              const photoItems = (pRes.data || []).map((p) => normalizePhotoRow(p));
              const merged = [...videoItems, ...photoItems].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              );
              updateList(merged);
              setTab("foryou");
            })
            .catch((err) => {
              console.error("search err", err);
            });
        }}
        initial={searchQueryRef.current}
      />
    </div>
  );
}
