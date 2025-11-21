import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "./Upload.css";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const WORKER_UPLOAD_URL = "https://r2upload.dataphim002.workers.dev/upload";

  // Chọn file + xem preview
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreviewURL(URL.createObjectURL(f));
  };

  // Upload video lên Cloudflare Worker
  const uploadToR2 = async () => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(WORKER_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      console.error("R2 error:", data);
      return null;
    }
    return data.publicUrl;
  };

  // Lưu vào Supabase
  const saveToSupabase = async (url) => {
    const { error } = await supabase.from("videos").insert([
      {
        title,
        category,
        description,
        url,
      },
    ]);

    if (error) {
      console.error(error);
      return false;
    }

    return true;
  };

  // Xử lý Upload tổng
  const handleUpload = async () => {
    if (!file) {
      alert("Bạn chưa chọn video!");
      return;
    }

    setUploading(true);
    setStatus("Đang upload...");

    // Upload video
    const videoUrl = await uploadToR2();
    if (!videoUrl) {
      setStatus("Upload thất bại!");
      setUploading(false);
      return;
    }

    // Lưu DB
    const ok = await saveToSupabase(videoUrl);
    if (!ok) {
      setStatus("Lỗi lưu database!");
      setUploading(false);
      return;
    }

    setStatus("Upload thành công!");

    // Reset form
    setFile(null);
    setPreviewURL("");
    setTitle("");
    setCategory("");
    setDescription("");

    // Redirect về TRANG CHỦ (/) — FIX LỖI TRỐNG TRANG
    setTimeout(() => {
      window.location.href = "/";
    }, 900);

    setUploading(false);
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload Video</h2>

        <div className="upload-row">

          <div className="preview-col">
            <div className="preview-box">
              {!previewURL && <div className="preview-empty">Preview</div>}
              {previewURL && (
                <video className="preview-video" src={previewURL} controls />
              )}
            </div>
          </div>

          <div className="form-col">
            <div className="field">
              <span>Chọn video</span>
              <input type="file" accept="video/*" onChange={handleFileChange} />
            </div>

            <div className="field">
              <span>Tiêu đề</span>
              <input
                type="text"
                placeholder="Nhập tiêu đề..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="field">
              <span>Thể loại</span>
              <input
                type="text"
                placeholder="Funny, Music..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="field">
              <span>Mô tả</span>
              <textarea
                rows={4}
                placeholder="Mô tả video..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <button
              className="upload-btn small-btn"
              disabled={uploading}
              onClick={handleUpload}
            >
              {uploading ? "Đang upload..." : "Upload"}
            </button>

            {status && <p className="status-text">{status}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}
