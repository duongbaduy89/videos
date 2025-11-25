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

/**
 * Props:
 * - videoUrl (string) OR video (object) -> this component will prefer videoUrl prop
 * - autoPlayEnabled (bool)
 * - onOpenComments (fn)
 * - onLike (fn)
 * - liked (bool)
 */
export default function TwitterVideoPlayer({
  videoUrl,
  video,
  autoPlayEnabled = true,
  onOpenComments,
  onLike,
  liked,
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(autoPlayEnabled);
  const [muted, setMuted] = useState(!autoPlayEnabled);

  useEffect(() => {
    // autoplay handling: if autoplay disabled, set muted true by default to avoid issues on some browsers
    setMuted(!autoPlayEnabled);
  }, [autoPlayEnabled]);

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

  const src = videoUrl || (video && (video.url || video.video_url));

  return (
    <div
      className="twitter-container"
      onClick={(e) => {
        // click on video container toggles play/pause unless clicking a control
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
        src={src}
        playsInline
        loop
        autoPlay={autoPlayEnabled}
        muted={muted}
        className="twitter-video"
      />

      {/* RIGHT BUTTONS */}
      <div className="twitter-right-controls" onClick={(e) => e.stopPropagation()}>
        {/* COMMENT */}
        <button
          className="t-btn"
          onClick={() => {
            if (onOpenComments) onOpenComments();
          }}
          title="Bình luận"
        >
          <FiMessageCircle size={22} />
        </button>

        {/* LIKE */}
        <button
          className="t-btn"
          onClick={() => {
            if (onLike) onLike();
          }}
          title="Thích"
        >
          {liked ? <AiFillHeart size={24} color="red" /> : <AiOutlineHeart size={24} />}
        </button>

        {/* SAVE / BOOKMARK */}
        <button className="t-btn" title="Lưu">
          <FiBookmark size={22} />
        </button>

        {/* MUTE / UNMUTE */}
        <button
          className="t-btn"
          onClick={() => {
            setMuted((m) => {
              const newMute = !m;
              try {
                if (videoRef.current) videoRef.current.muted = newMute;
              } catch (e) {}
              return newMute;
            });
          }}
          title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {muted ? <FiVolumeX size={22} /> : <FiVolume2 size={22} />}
        </button>

        {/* FULLSCREEN */}
        <button
          className="t-btn"
          onClick={() => videoRef.current?.requestFullscreen?.()}
          title="Toàn màn hình"
        >
          <IoExpandOutline size={22} />
        </button>
      </div>
    </div>
  );
}
