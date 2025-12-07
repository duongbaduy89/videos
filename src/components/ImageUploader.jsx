import React, { useState } from "react";

export default function ImageUploader({ onUploaded }) {
  const [loading, setLoading] = useState(false);

  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dy2nxrviw/image/upload";
  const UPLOAD_PRESET = "unsigned_upload";

  async function handleFiles(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    let uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      console.log("Cloudinary response:", data);

      if (data.secure_url) {
        uploaded.push({
          url: data.secure_url,
          preview: URL.createObjectURL(file)
        });
      }
    }

    setLoading(false);
    onUploaded(uploaded);
  }

  return (
    <div className="field">
      <span>Chọn ảnh (nhiều ảnh)</span>
      <input type="file" multiple accept="image/*" onChange={handleFiles} />
      {loading && <p className="status-text">Đang upload...</p>}
    </div>
  );
}
