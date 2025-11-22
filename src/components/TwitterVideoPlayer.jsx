import React, { useEffect, useRef, useState } from "react";
import {
  FiMessageCircle,
  FiShare,
  FiBookmark,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { IoExpandOutline } from "react-icons/io5";
import "../styles/twitterVideo.css";

export default function TwitterVideoPlayer({
  videoUrl,
  autoPlayEnabled,
  onOpenComments,
  onLike,
  liked,
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(autoPlayEnabled);
  const [muted, setMuted] = useState(!autoPlayEnabled);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      className="twitter-container"
      onClick={(e) => {
        if (
          !e.target.closest(".t-btn") &&
          !e.target.closest(".twitter-progress-wrap")
        ) {
          togglePlay();
        }
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        loop
        autoPlay={autoPlayEnabled}
        muted={muted}
        className="twitter-video"
      />

      {/* RIGHT BUTTONS */}
      <div className="twitter-right-controls" onClick={(e) => e.stopPropagation()}>
        
        {/* COMMENT */}
        <button className="t-btn" onClick={onOpenComments}>
          <FiMessageCircle size={22} />
        </button>

        {/* LIKE */}
        <button className="t-btn" onClick={onLike}>
          {liked ? (
            <AiFillHeart size={24} color="red" />
          ) : (
            <AiOutlineHeart size={24} />
          )}
        </button>

        <button className="t-btn">
          <FiBookmark size={22} />
        </button>

        <button className="t-btn" onClick={() => setMuted(!muted)}>
          {muted ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
        </button>

        <button className="t-btn" onClick={() => videoRef.current?.requestFullscreen()}>
          <IoExpandOutline size={22} />
        </button>
      </div>
    </div>
  );
}
