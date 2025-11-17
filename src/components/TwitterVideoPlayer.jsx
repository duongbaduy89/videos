// src/components/TwitterVideoPlayer.jsx
import React, { useEffect, useRef, useState } from "react";
import { FiMessageCircle, FiShare, FiBookmark, FiVolume2, FiVolumeX } from "react-icons/fi";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { IoExpandOutline } from "react-icons/io5";
import "../styles/twitterVideo.css";

/**
 * Props:
 *  - videoUrl (string)
 *  - avatar (string)
 *  - username (string)
 *  - stats: { comments, likes, views }
 *  - onEnded (optional) -> called when video ends
 */
export default function TwitterVideoPlayer({
  videoUrl,
  avatar,
  username,
  stats = { comments: 0, likes: 0, views: "0" },
  onEnded,
}) {
  const videoRef = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true); // start muted to allow autoplay
  const [liked, setLiked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // play on mount if possible
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.play().catch(() => {}); // ignore autoplay rejection
  }, [videoUrl]);

  // time update handler
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrentTime(v.currentTime);
      setDuration(v.duration || 0);
    };
    const onEndedLocal = () => {
      setPlaying(false);
      if (onEnded) onEnded();
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onTime);
    v.addEventListener("ended", onEndedLocal);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onTime);
      v.removeEventListener("ended", onEndedLocal);
    };
  }, [videoRef.current, onEnded]);

  // toggle play/pause (also called on tap)
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // toggle mute: ensure set video.muted before state change for better cross-browser
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    // ensure play after user interaction (some browsers require)
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  // progress click/seek
  const onSeek = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const v = videoRef.current;
    if (!v || !duration || isNaN(duration)) return;
    v.currentTime = pct * duration;
    setCurrentTime(v.currentTime);
  };

  // format time mm:ss
  const fmt = (t = 0) => {
    if (!isFinite(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="twitter-container" onClick={(e) => {
      // if user clicked controls (right side), ignore tap-to-play
      const cls = e.target.className || "";
      // small safeguard: if click on button, don't toggle
      if (e.target.closest("button")) return;
      togglePlay();
    }}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="twitter-video"
        autoPlay
        loop
        playsInline
        muted={muted}
      />

      {/* USER INFO (bottom-left) */}
      <div className="twitter-user-info">
        <img src={avatar} alt="avatar" className="twitter-avatar" />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="twitter-username">{username}</div>
        </div>
      </div>

      {/* RIGHT SIDE BUTTONS (always visible, not auto-hide) */}
      <div className="twitter-right-controls" onClick={(e) => e.stopPropagation()}>
        <button className="t-btn" title="Comment">
          <FiMessageCircle size={20} />
          <span>{stats.comments}</span>
        </button>

        <button className="t-btn" title="Like" onClick={() => setLiked((s) => !s)}>
          {liked ? <AiFillHeart size={22} color="#ff2e63" /> : <AiOutlineHeart size={22} />}
          <span>{liked ? (Number(stats.likes || 0) + 1) : stats.likes}</span>
        </button>

        <button className="t-btn" title="Views">
          <span className="t-views-icon">👁</span>
          <span>{stats.views}</span>
        </button>

        <button className="t-btn" title="Bookmark">
          <FiBookmark size={20} />
        </button>

        <button className="t-btn" title="Share">
          <FiShare size={20} />
        </button>

        <button className="t-btn" title={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
          {muted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
        </button>

        <button className="t-btn" title="Fullscreen" onClick={() => {
          const v = videoRef.current;
          if (v && v.requestFullscreen) v.requestFullscreen().catch(()=>{});
        }}>
          <IoExpandOutline size={20} />
        </button>
      </div>

      {/* BOTTOM PROGRESS + time info */}
      <div className="twitter-progress-wrap" onClick={onSeek} ref={progressRef}>
        <div
          className="twitter-progress-filled"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
        />
        <div className="twitter-time">
          <span>{fmt(currentTime)}</span>
          <span style={{ opacity: 0.7, marginLeft: 8 }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* small play icon overlay when paused */}
      {!playing && (
        <div className="twitter-paused-overlay" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          ▶
        </div>
      )}
    </div>
  );
}
