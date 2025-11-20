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

export default function TwitterVideoPlayer({ videoUrl }) {
  const videoRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);

  const [playing, setPlaying] = useState(true);
  const [forceMuted, setForceMuted] = useState(false); // mute/unmute UI
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ==========================================
  // AUTO UNMUTE – WebAudio BYPASS AUTOPLAY RULE
  // ==========================================
  const setupAudioBypass = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioCtx = audioCtxRef.current;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Tạo audio pipeline
      sourceRef.current = audioCtx.createMediaElementSource(video);
      gainNodeRef.current = audioCtx.createGain();

      sourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioCtx.destination);

      // Đảm bảo video được autoplay
      video.muted = true;
      await video.play().catch(() => {});
    } catch (err) {
      console.log("Audio bypass error:", err);
    }
  };

  // ==========================================
  // PLAY ON LOAD + AUTO UNMUTE
  // ==========================================
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = async () => {
      await setupAudioBypass();
      v.play().catch(() => {});
    };

    v.addEventListener("loadeddata", onLoaded);
    return () => v.removeEventListener("loadeddata", onLoaded);
  }, [videoUrl]);

  // ==========================================
  // UPDATE TIME
  // ==========================================
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

  // ==========================================
  // PLAY / PAUSE
  // ==========================================
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

  // ==========================================
  // MUTE UI (real sound from WebAudio)
  // ==========================================
  const toggleMute = () => {
    const gain = gainNodeRef.current;
    if (!gain) return;

    const newMuted = !forceMuted;
    setForceMuted(newMuted);

    gain.gain.value = newMuted ? 0 : 1;
  };

  // ==========================================
  // SEEK
  // ==========================================
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
        if (!e.target.closest(".t-btn") && !e.target.closest(".twitter-progress-wrap")) {
          togglePlay();
        }
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        loop
        autoPlay
        muted={true} // Browser sees muted but audio is sent via WebAudio
        className="twitter-video"
      />

      {/* RIGHT CONTROLS */}
      <div className="twitter-right-controls" onClick={(e) => e.stopPropagation()}>
        <button className="t-btn"><FiMessageCircle size={22} /></button>
        <button className="t-btn"><AiOutlineHeart size={22} /></button>
        <button className="t-btn"><FiBookmark size={22} /></button>

        <button className="t-btn" onClick={toggleMute}>
          {forceMuted ? <FiVolumeX size={22}/> : <FiVolume2 size={22}/>}
        </button>

        <button className="t-btn" onClick={() => videoRef.current?.requestFullscreen()}>
          <IoExpandOutline size={22} />
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="twitter-progress-wrap" onClick={seek}>
        <div
          className="twitter-progress-filled"
          style={{
            width: duration ? `${(currentTime / duration) * 100}%` : "0%",
          }}
        />
      </div>

      {!playing && (
        <div className="twitter-paused-overlay" onClick={() => togglePlay()}>
          ▶
        </div>
      )}
    </div>
  );
}
