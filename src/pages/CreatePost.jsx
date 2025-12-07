// src/pages/CreatePost.jsx
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

import ImageUploader from "../components/ImageUploader";
import ImageGallery from "../components/ImageGallery";

export default function CreatePost() {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("");

  async function handleSubmit() {
    try {
      if (!user) return setStatus("❌ Bạn chưa đăng nhập");
      if (images.length === 0) return setStatus("❌ Chưa chọn ảnh");

      setStatus("⏳ Đang đăng bài...");

      // Lấy tất cả URL ảnh dưới dạng array
      const urls = images.map((img) => img.url);

      // INSERT 1 DÒNG DUY NHẤT
      const { error } = await supabase.from("photos").insert({
        user_id: user.id,
        title,
        description,
        url: urls, // ARRAY
        created_at: new Date(),
      });

      if (error) {
        console.error(error);
        throw new Error("Lỗi insert Supabase");
      }

      setStatus("✔ Đăng bài thành công!");

      // reset form
      setTitle("");
      setDescription("");
      setImages([]);

    } catch (err) {
      setStatus("❌ Lỗi: " + err.message);
    }
  }

  return (
    <div className="upload-page text-white">
      <div className="upload-card">
        <h2 className="text-xl font-bold mb-3">Tạo bài viết ảnh</h2>

        <ImageUploader onUploaded={setImages} />

        {images.length > 0 && (
          <ImageGallery images={images} />
        )}

        {/* Title */}
        <div className="field">
          <span>Tiêu đề</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề..."
          />
        </div>

        {/* Description */}
        <div className="field">
          <span>Mô tả</span>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập mô tả..."
          />
        </div>

        {/* Submit */}
        <button className="upload-btn" onClick={handleSubmit}>
          Đăng bài
        </button>

        <p className="status-text">{status}</p>
      </div>
    </div>
  );
}
