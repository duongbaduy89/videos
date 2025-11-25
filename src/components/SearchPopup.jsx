import React from "react";
import "./VideoFeed.css";

export default function SearchPopup({ visible, onClose, onSearch, initial = "" }) {
  const [q, setQ] = React.useState(initial);

  React.useEffect(() => {
    setQ(initial);
  }, [initial]);

  if (!visible) return null;

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-head">
          <input
            autoFocus
            placeholder="Tìm tiêu đề hoặc thể loại..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch(q);
                onClose();
              }
            }}
          />
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="search-modal-actions">
          <button onClick={() => { onSearch(q); onClose(); }} className="search-go">Tìm</button>
        </div>
      </div>
    </div>
  );
}
