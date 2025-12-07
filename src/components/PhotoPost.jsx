// src/components/PhotoPost.jsx
import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";
import "../styles/PhotoPost.css";

export default function PhotoPost({ item, onLike, onOpenComments, onFollow }) {
  const images = Array.isArray(item.url) ? item.url : [];

  const [viewerIndex, setViewerIndex] = useState(null);

  // Swipe trong viewer
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (viewerIndex < images.length - 1) {
        setViewerIndex((i) => i + 1);
      }
    },
    onSwipedRight: () => {
      if (viewerIndex > 0) {
        setViewerIndex((i) => i - 1);
      }
    },
    trackTouch: true,
    trackMouse: false,
  });

  return (
    <div className="photo-wrapper">
      {/* GRID ẢNH */}
      <div className={`photo-grid ${images.length >= 2 ? "multi" : "single"}`}>
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            className="photo-thumb"
            onClick={() => setViewerIndex(idx)}
            alt=""
          />
        ))}
      </div>

      {/* TEXT */}
      <div className="photo-text">
        <div className="photo-title">{item.title}</div>
        <div className="photo-desc">{item.description}</div>
      </div>

      {/* VIEWER FULLSCREEN */}
      {viewerIndex !== null && (
        <div className="photo-viewer" onClick={() => setViewerIndex(null)}>
          <div {...handlers} className="viewer-swipe-area">
            <img src={images[viewerIndex]} className="viewer-img" alt="" />
          </div>
          <div className="viewer-count">
            {viewerIndex + 1}/{images.length}
          </div>
        </div>
      )}
    </div>
  );
}
