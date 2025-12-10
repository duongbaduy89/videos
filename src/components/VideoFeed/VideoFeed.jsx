// src/components/VideoFeed/VideoFeed.jsx
import React, { useRef, useState } from "react";
import { useAnimation } from "framer-motion";
import useFeedData from "./useFeedData";
import useSwipe from "./useSwipe";
import FeedItem from "./FeedItem";

import CommentPanel from "../CommentPanel";
import SearchPopup from "../SearchPopup";
import { supabase } from "../../supabaseClient";
import "../../styles/VideoFeed.css";

export default function VideoFeed() {
  const {
    tab,
    setTab,
    list,
    index,
    setIndex,
    currentVideo,
    likesCount,
    commentsCount,
    isLiked,
    isFollowing,
    toggleLike,
    toggleFollow,
    searchOpen,
    setSearchOpen,
    searchQueryRef,
    updateList,
  } = useFeedData();

  // COMMENT PANEL CONTROL
  const [showComments, setShowComments] = useState(false);

  const openComments = () => setShowComments(true);
  const closeComments = () => setShowComments(false);

  // SWIPE & MOTION
  const containerRef = useRef(null);
  const nextRef = useRef(null);
  const yControls = useAnimation();
  const nextControls = useAnimation();

  const { handlers, onDrag, onDragEnd } = useSwipe({
    list,
    index,
    setIndex,
    yControls,
    nextControls,
    containerRef,
    nextRef,
  });

  const nextItem =
    list.length > 1 ? list[(index + 1) % list.length] : null;

  return (
    <div className="videofeed-root" {...handlers} ref={containerRef}>
      
      {/* TOP TABS */}
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

      {/* MAIN VIEW */}
      <div className="videofeed-viewport">
        {currentVideo ? (
          <FeedItem
            item={currentVideo}
            nextItem={nextItem}
            yControls={yControls}
            nextControls={nextControls}
            nextRef={nextRef}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            isLiked={isLiked}
            toggleLike={toggleLike}
            toggleFollow={toggleFollow}
            commentsCount={commentsCount}
            likesCount={likesCount}
            isFollowing={isFollowing}
            openComments={openComments}
          />
        ) : (
          <div className="empty-state">Không có nội dung để hiển thị</div>
        )}
      </div>

      {/* COMMENT PANEL */}
      {showComments && currentVideo && (
        <CommentPanel
          video={currentVideo}
          onClose={closeComments}
        />
      )}

      {/* SEARCH POPUP */}
      <SearchPopup
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(query) => {
          searchQueryRef.current = query;
          if (!query.trim()) return;

          const pattern = `%${query}%`;

          Promise.all([
            supabase
              .from("videos")
              .select("*, profiles:profiles(id,username,avatar_url)")
              .or(
                `title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`
              )
              .order("created_at", { ascending: false }),

            supabase
              .from("photos")
              .select("*, profiles:profiles(id,username,avatar_url)")
              .or(`title.ilike.${pattern},description.ilike.${pattern}`)
              .order("created_at", { ascending: false }),
          ])
            .then(([vRes, pRes]) => {
              const videoItems = (vRes.data || []).map((v) => ({
                ...v,
                type: "video",
              }));

              const photoItems = (pRes.data || []).map((p) => {
                let urlVal = p.url;
                try {
                  if (typeof urlVal === "string" && urlVal.trim().startsWith("[")) {
                    urlVal = JSON.parse(urlVal);
                  }
                } catch {}
                return { ...p, type: "photo", url: urlVal };
              });

              const merged = [...videoItems, ...photoItems].sort(
                (a, b) => new Date(b.created_at) - new Date(a.created_at)
              );

              updateList(merged);
              setTab("foryou");
            })
            .catch(console.error);
        }}
        initial={searchQueryRef.current}
      />
    </div>
  );
}
