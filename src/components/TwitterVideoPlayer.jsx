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
 * - videoUrl (string)
 * - video (object)
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
    // autoPlayEnabled thay đổi -> chỉnh muted theo nó
    setMuted(!autoPlayEnabled);
    if (videoRef.current) {
      videoRef.current.muted = !autoPlayEnabled;
    }
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
        // nhấn vào khoảng trống -> toggle play
        if (
          !e.target.closest(".t-btn") &&
          !e.target.closest(".twitter-right-controls") &&
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
        preload="metadata"
        className="twitter-video"
      />

      {/* RIGHT ACTION BUTTONS */}
      <div
        className="twitter-right-controls"
        onClick={(e) => e.stopPropagation()} // chặn click làm pause video
      >
        {/* COMMENT BUTTON */}
        <button
          className="t-btn"
          onClick={() => onOpenComments?.()}
          title="Bình luận"
        >
          <FiMessageCircle size={22} />
        </button>

        {/* LIKE BUTTON */}
        <button
          className="t-btn"
          onClick={() => onLike?.()}
          title="Thích"
        >
          {liked ? (
            <AiFillHeart size={24} color="red" />
          ) : (
            <AiOutlineHeart size={24} />
          )}
        </button>

        {/* SAVE */}
        <button className="t-btn" title="Lưu">
          <FiBookmark size={22} />
        </button>

        {/* MUTE / UNMUTE */}
        <button
          className="t-btn"
          onClick={() => {
            setMuted((prev) => {
              const next = !prev;
              if (videoRef.current) videoRef.current.muted = next;
              return next;
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
