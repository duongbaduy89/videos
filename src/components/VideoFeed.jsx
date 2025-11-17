import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import TwitterVideoPlayer from "./TwitterVideoPlayer";
import "./VideoFeed.css";

// =========================
// NHIỀU BUCKET / NHIỀU SUPABASE
// =========================
const BUCKETS = [
  { name: "videos", client: supabase }, // bucket chính của bạn
  // nếu có supabase clone thì thêm ở đây
  // { name: "videos_clone", client: supabaseClone1 },
];

export default function VideoFeed() {
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Upload
  const [showUploadBox, setShowUploadBox] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedBucket, setSelectedBucket] = useState(BUCKETS[0]);

  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // ============================
  // LẤY VIDEO TỪ DATABASE
  // ============================
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Lỗi load video:", error);
    else setVideos(data || []);
  };

  // ============================
  // SWIPE MOBILE
  // ============================
  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const onTouchEnd = () => {
    const swipeDistance = touchEndY.current - touchStartY.current;

    if (swipeDistance > 80) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0)); // vuốt xuống → về video trước
    } else if (swipeDistance < -80) {
      setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1)); // vuốt lên → video tiếp
    }
  };

  // ============================
  // WHEEL PC
  // ============================
  const onWheel = (e) => {
    if (e.deltaY > 0) {
      setCurrentIndex((prev) => Math.min(prev + 1, videos.length - 1));
    } else {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  // ============================
  // UPLOAD VIDEO
  // ============================
  const handleUpload = async () => {
    if (!uploadFile) return alert("Bạn chưa chọn file!");

    const ext = uploadFile.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const client = selectedBucket.client;

    // 1) Upload file
    const { data, error } = await client.storage
      .from(selectedBucket.name)
      .upload(fileName, uploadFile, { upsert: true });

    if (error) {
      console.error("Upload lỗi:", error);
      alert("Upload thất bại!");
      return;
    }

    // tạo progress giả lập (Supabase không hỗ trợ progress thật)
    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      setUploadProgress(progress);
      if (progress >= 100) clearInterval(interval);
    }, 150);

    // 2) Lấy URL public
    const { data: publicData } = client.storage
      .from(selectedBucket.name)
      .getPublicUrl(fileName);

    const videoUrl = publicData.publicUrl;

    // 3) Thêm vào bảng videos
    const { error: insertErr } = await client.from("videos").insert({
      url: videoUrl,
      title: "Video mới",
      description: "",
      category: "",
      duration: null,
      user_id: null,
    });

    if (insertErr) {
      console.error(insertErr);
      alert("Không ghi được vào bảng videos!");
      return;
    }

    alert("Upload thành công!");

    setShowUploadBox(false);
    setUploadFile(null);
    setUploadProgress(0);
    fetchVideos();
  };

  return (
    <div
      className="videofeed-wrapper"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ---------------------- */}
      {/* TOP NAV */}
      {/* ---------------------- */}
      <div className="top-nav">
        <button className="nav-btn">Đăng ký</button>
        <button className="nav-btn">Đăng nhập</button>

        <button
          className="upload-btn"
          onClick={() => setShowUploadBox(true)}
        >
          Upload
        </button>
      </div>

      {/* ---------------------- */}
      {/* UPLOAD BOX */}
      {/* ---------------------- */}
      {showUploadBox && (
        <div className="upload-box">
          <h3>Tải video lên</h3>

          <label>Chọn bucket:</label>
          <select
            onChange={(e) =>
              setSelectedBucket(
                BUCKETS.find((b) => b.name === e.target.value)
              )
            }
          >
            {BUCKETS.map((b) => (
              <option key={b.name}>{b.name}</option>
            ))}
          </select>

          <input
            type="file"
            accept="video/*"
            onChange={(e) => setUploadFile(e.target.files[0])}
          />

          {uploadProgress > 0 && (
            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <button className="upload-confirm" onClick={handleUpload}>
            Tải lên
          </button>

          <button
            className="upload-cancel"
            onClick={() => setShowUploadBox(false)}
          >
            Hủy
          </button>
        </div>
      )}

      {/* ---------------------- */}
      {/* VIDEO PLAYER */}
      {/* ---------------------- */}
      {videos.length > 0 ? (
        <TwitterVideoPlayer
          key={videos[currentIndex].id}
          videoUrl={videos[currentIndex].url}
          avatar="https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
          username="unknown"
          stats={{ comments: 0, likes: 0, views: 0 }}
        />
      ) : (
        <div className="loading-text">Đang tải video...</div>
      )}
    </div>
  );
}
