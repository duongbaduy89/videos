import React, { useState } from "react";
import FullscreenViewer from "./FullscreenViewer";
import "./ImageGallery.css";

export default function ImageGallery({ images }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <>
      <div className="gallery-grid">
        {images.map((img, i) => (
          <div key={i} className="gallery-item" onClick={() => setOpenIndex(i)}>
            <img src={img.url} alt="" />
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <FullscreenViewer
          images={images}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
