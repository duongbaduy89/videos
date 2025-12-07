// src/components/ModalUploadOption.jsx
import React from "react";

export default function ModalUploadOption({ open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="modal-upload-option">
      <div className="modal-upload-content">
        <h2>Tạo nội dung</h2>

        <button onClick={() => onSelect("photo")}>🖼 Đăng ảnh</button>
        <button onClick={() => onSelect("video")}>🎥 Đăng video</button>
        <button onClick={onClose} className="cancel-btn">Hủy</button>
      </div>
    </div>
  );
}
