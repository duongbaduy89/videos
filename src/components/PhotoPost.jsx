// src/components/PhotoPost.jsx
import React, { useState, useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import "../styles/PhotoPost.css";

export default function PhotoPost({ item, onLike, onOpenComments, onFollow }) {
  const { user } = useAuth();
  const images = Array.isArray(item.url) ? item.url : [];

  const [viewerIndex, setViewerIndex] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const viewerRef = useRef(null);

  // LOAD LIKE (dùng bảng likes chung)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: likes } = await supabase
          .from("likes")
          .select("id")
          .eq("photo_id", item.id);

        if (!mounted) return;
        setLikesCount(likes?.length || 0);

        if (user) {
          const { data: me } = await supabase
            .from("likes")
            .select("*")
            .eq("photo_id", item.id)
            .eq("user_id", user.id)
            .maybeSingle();

          setIsLiked(!!me);
        }
      } catch (err) {
        console.error("load photo likes err", err);
      }
    };

    load();
    return () => (mounted = false);
  }, [item.id, user]);


  // TOGGLE LIKE (ảnh)
  const toggleLike = async (e) => {
    e?.stopPropagation();
    if (!user) return alert("Bạn cần đăng nhập để like");

    try {
      if (!isLiked) {
        await supabase.from("likes").insert({
          user_id: user.id,
          photo_id: item.id,
          video_id: null,
        });

        setIsLiked(true);
        setLikesCount((c) => c + 1);

        if (typeof onLike === "function") onLike();

      } else {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", user.id)
          .eq("photo_id", item.id);

        setIsLiked(false);
        setLikesCount((c) => Math.max(0, c - 1));
      }

    } catch (err) {
      console.error("toggleLike err", err);
    }
  };

  // viewer swipe
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (viewerIndex < images.length - 1) setViewerIndex((i) => i + 1);
    },
    onSwipedRight: () => {
      if (viewerIndex > 0) setViewerIndex((i) => i - 1);
    },
    onSwipedDown: () => setViewerIndex(null),
    trackTouch: true,
  });

  // block scroll
  useEffect(() => {
    document.body.style.overflow = viewerIndex !== null ? "hidden" : "";
  }, [viewerIndex]);

  return (
    <div className="photopost-root">
      {/* GRID */}
      <div className={`photo-grid ${images.length > 1 ? "multi" : "single"}`}>
        {images.map((src, idx) => (
          <div key={idx} className="photo-thumb-wrap">
            <img
              src={src}
              className="photo-thumb"
              alt=""
              onClick={() => setViewerIndex(idx)}
            />
          </div>
        ))}
      </div>

      {/* ACTION ROW — KHÔNG có title/description (đã bỏ để tránh trùng) */}
      <div className="photo-meta-row">
        <div className="photo-meta-actions">
          <button className={`icon-btn like-btn ${isLiked ? "liked" : ""}`} onClick={toggleLike}>
            ❤️ {likesCount}
          </button>

          <button
            className="icon-btn comment-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments && onOpenComments();
            }}
          >
            💬
          </button>

          <button
            className="icon-btn follow-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFollow && onFollow();
            }}
          >
            ➕
          </button>
        </div>
      </div>

      {/* FULLSCREEN VIEWER */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <motion.div
            className="photo-viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewerIndex(null)}
          >
            <div {...handlers} className="viewer-swipe-area">
              <motion.img
                key={images[viewerIndex]}
                src={images[viewerIndex]}
                className="viewer-img"
                initial={{ y: 40, scale: 0.96 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: -40, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="viewer-ui">
              <div className="viewer-counter">
                {viewerIndex + 1}/{images.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
