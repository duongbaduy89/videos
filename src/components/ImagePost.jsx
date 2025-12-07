// src/components/ImagePost.jsx
import React, { useState } from "react";

/**
 * ImagePost
 * - images: array of url strings OR a single string (if your photos.url is a string)
 * - title, description
 * - id: id của bài (photo row id)
 *
 * NOTE: Thao tác like/comment sẽ emit CustomEvent để app hiện tại bắt nếu muốn.
 */
export default function ImagePost({ images, title, description, id, user }) {
  // chuẩn hóa images thành mảng
  const imgs = Array.isArray(images) ? images : [images];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };
  const next = () => {
    if (index < imgs.length - 1) setIndex(index + 1);
  };

  const onLike = () => {
    // phát event like để hệ thống xử lý (hoặc bạn thay bằng supabase insert)
    window.dispatchEvent(
      new CustomEvent("itemLike", { detail: { id, type: "photo" } })
    );
  };

  const onComment = () => {
    // phát event mở comment modal
    window.dispatchEvent(
      new CustomEvent("openComments", { detail: { id, type: "photo" } })
    );
  };

  const onShare = () => {
    window.dispatchEvent(
      new CustomEvent("shareItem", { detail: { id, type: "photo", url: imgs[index] } })
    );
  };

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black">
      <div
        style={{ width: "100%", height: "100%" }}
        className="flex items-center justify-center"
      >
        <img
          src={imgs[index]}
          alt={title || "photo"}
          onDoubleClick={onLike}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            cursor: "zoom-in",
            transition: "transform .2s",
            transform: zoom ? "scale(1.8)" : "scale(1)",
          }}
          onClick={() => setZoom((z) => !z)}
        />
      </div>

      {/* prev/next */}
      {imgs.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={prev}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: 40,
                padding: "6px 8px",
                cursor: "pointer",
                opacity: 0.85,
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}
          {index < imgs.length - 1 && (
            <button
              onClick={next}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: 40,
                padding: "6px 8px",
                cursor: "pointer",
                opacity: 0.85,
              }}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </>
      )}

      {/* title/description bottom-left */}
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 16,
          right: 100,
          color: "white",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}
      >
        {title && <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>}
        {description && <div style={{ fontSize: 14 }}>{description}</div>}
      </div>

      {/* action column (right) */}
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 90,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          alignItems: "center",
        }}
      >
        <button
          onClick={onLike}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: 20,
            cursor: "pointer",
          }}
          aria-label="Like"
        >
          ♥
        </button>

        <button
          onClick={onComment}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: 20,
            cursor: "pointer",
          }}
          aria-label="Comment"
        >
          💬
        </button>

        <button
          onClick={onShare}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            fontSize: 20,
            cursor: "pointer",
          }}
          aria-label="Share"
        >
          ⤴
        </button>
      </div>
    </div>
  );
}
