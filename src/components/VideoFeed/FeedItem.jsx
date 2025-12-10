// FeedItem.jsx
import React from "react";
import { motion } from "framer-motion";
import TwitterVideoPlayer from "../TwitterVideoPlayer";
import PhotoPost from "../PhotoPost";

export default function FeedItem({
  item,
  nextItem,
  yControls,
  nextControls,
  nextRef,
  onDrag,
  onDragEnd,
  isLiked,
  toggleLike,
  toggleFollow,
  commentsCount,
  likesCount,
  isFollowing,
  openComments,
}) {
  return (
    <>
      {/* NEXT PREVIEW (video/photo) */}
      {nextItem && (
        <motion.div
          key={"next-preview-" + item.id}
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
          {nextItem.type === "video" ? (
            <TwitterVideoPlayer
              video={nextItem}
              videoUrl={nextItem.url}
              autoPlayEnabled={false}
            />
          ) : (
            <PhotoPost item={nextItem} />
          )}
        </motion.div>
      )}

      {/* CURRENT ITEM */}
      <motion.div
        key={"current-" + item.id}
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
        {item.type === "video" ? (
          <TwitterVideoPlayer
            key={item.id}
            video={item}
            videoUrl={item.url}
            autoPlayEnabled={true}
            liked={isLiked}
            onLike={toggleLike}
            onOpenComments={openComments}
          />
        ) : (
          <PhotoPost
            item={item}
            onLike={toggleLike}
            onOpenComments={openComments}
            onFollow={toggleFollow}
          />
        )}
      </motion.div>

      {/* OVERLAY UI (user info + follow + title + desc) */}
      <div className="info-overlay">
        <div className="author-row">
          <a href={`/profile/${item.user_id}`} className="author-link">
            <img
              src={item.profiles?.avatar_url || "/default-avatar.png"}
              className="author-avatar"
              alt="avatar"
            />

            <div className="author-meta">
              <div className="author-name">
                @{item.profiles?.username}
              </div>

              <div className="video-cat">
                {item.category ||
                  (item.type === "photo" ? "photo" : "")}
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

        {/* TITLE + DESCRIPTION */}
        <div className="title-desc">
          <div className="video-title">{item.title}</div>
          <div className="video-desc">{item.description}</div>
        </div>
      </div>
    </>
  );
}
