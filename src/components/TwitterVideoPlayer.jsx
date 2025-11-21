import React, { useEffect, useRef, useState } from "react";
import {
  FiMessageCircle,
  FiShare,
  FiBookmark,
  FiVolume2,
  FiVolumeX,
} from "react-icons/fi";
import { AiOutlineHeart } from "react-icons/ai";
import { IoExpandOutline } from "react-icons/io5";
import "../styles/twitterVideo.css";

export default function TwitterVideoPlayer({
  videoUrl,
  autoPlayEnabled,
  onUserPlay,
  onOpenComments,
  onLike,
}) {
  const videoRef = useRef(null);

  const [playing, setPlaying] = useState(autoPlayEnabled);
  const [muted, setMuted] = useState(!autoPlayEnabled);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (autoPlayEnabled) {
      v.muted = false;
      v.play().catch(() => {});
      setPlaying(true);
    }
  }, [autoPlayEnabled, videoUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      setCurrentTime(v.currentTime || 0);
      setDuration(v.duration || 0);
    };

    v.addEventListener("timeupdate", tick);
    v.addEventListener("loadedmetadata", tick);

    return () => {
      v.removeEventListener("timeupdate", tick);
      v.removeEventListener("loadedmetadata", tick);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;

    if (v.paused) {
      v.play();
      setPlaying(true);
      if (onUserPlay) onUserPlay();
      v.muted = false;
      setMuted(false);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = !muted;
    setMuted(!muted);
  };

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = pct * v.duration;
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

      <div className="twitter-right-controls" onClick={(e) => e.stopPropagation()}>
        <button className="t-btn" onClick={() => onOpenComments?.()}>
          <FiMessageCircle size={22} />
        </button>

        <button className="t-btn" onClick={() => onLike?.()}>
          <AiOutlineHeart size={22} />
        </button>

        <button className="t-btn">
          <FiBookmark size={22} />
        </button>

        <button className="t-btn" onClick={toggleMute}>
          {muted ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
        </button>

        <button className="t-btn" onClick={() => videoRef.current?.requestFullscreen()}>
          <IoExpandOutline size={22} />
        </button>
      </div>

      <div className="twitter-progress-wrap" onClick={seek}>
        <div
          className="twitter-progress-filled"
          style={{
            width: duration ? `${(currentTime / duration) * 100}%` : "0%",
          }}
        />
      </div>

      {!playing && (
        <div className="twitter-paused-overlay" onClick={togglePlay}>
          ▶
        </div>
      )}
    </div>
  );
}
