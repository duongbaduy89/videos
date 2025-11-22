import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";   // ⭐ cần để lấy user đăng nhập
import "./Upload.css";

export default function Upload() {
  const { user } = useAuth();   // ⭐ Lấy user
  const [file, setFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  const WORKER_UPLOAD_URL = "https://r2upload.dataphim002.workers.dev/upload";

  // chọn file + xem preview
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreviewURL(URL.createObjectURL(f));
  };

  // upload video lên Cloudflare R2
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

  // lưu DB vào Supabase
  const saveToSupabase = async (url) => {

    // ⭐ KIỂM TRA USER ĐĂNG NHẬP
    if (!user) {
      alert("Bạn cần đăng nhập trước khi upload video!");
      return false;
    }

    const { error } = await supabase.from("videos").insert([
      {
        title,
        category,
        description,
        url,
        user_id: user.id,   // ⭐ LƯU USER ĐĂNG VIDEO
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return false;
    }

    return true;
  };

  // xử lý upload tổng
  const handleUpload = async () => {
    if (!file) {
      alert("Bạn chưa chọn video!");
      return;
    }

    setUploading(true);
    setStatus("Đang upload...");

    // upload file lên R2
    const videoUrl = await uploadToR2();
    if (!videoUrl) {
      setStatus("Upload thất bại!");
      setUploading(false);
      return;
    }

    // lưu metadata vào Supabase
    const ok = await saveToSupabase(videoUrl);
    if (!ok) {
      setStatus("Lỗi lưu database!");
      setUploading(false);
      return;
    }

    setStatus("Upload thành công!");

    // reset form
    setFile(null);
    setPreviewURL("");
    setTitle("");
    setCategory("");
    setDescription("");

    // chuyển về trang chủ
    setTimeout(() => {
      window.location.href = "/";
    }, 900);

    setUploading(false);
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload Video</h2>

        {/* ⭐ NÚT UPLOAD NHỎ GỌN – MÀU ĐỎ */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: "160px",
            padding: "10px",
            background: "#ff4d4d",
            border: "none",
            borderRadius: "10px",
            fontWeight: "600",
            color: "#fff",
            marginBottom: "25px",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 4px 10px rgba(255,50,50,0.35)",
          }}
        >
          {uploading ? "Đang upload..." : "Upload"}
        </button>

        <div className="upload-row">
          {/* cột preview */}
          <div className="preview-col">
            <div className="preview-box">
              {!previewURL && <div className="preview-empty">Preview</div>}
              {previewURL && (
                <video className="preview-video" src={previewURL} controls />
              )}
            </div>
          </div>

          {/* cột form */}
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

            {status && <p className="status-text">{status}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
