import React from "react";
import "./FullscreenViewer.css";

export default function FullscreenViewer({ images, index, onClose }) {
  return (
    <div className="fullscreen-viewer">
      <button className="close-btn" onClick={onClose}>×</button>
      <img src={images[index].url} className="fullscreen-image" />
    </div>
  );
}
