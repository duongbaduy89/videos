import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function UploadVideo({ buckets, onDone }) {
  const [file, setFile] = useState(null);
  const [bucket, setBucket] = useState(buckets[0]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Upload handler
  const handleUpload = async () => {
    if (!file) return alert("Chưa chọn file");

    setUploading(true);
    setProgress(10);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    // 1. Upload video vào bucket
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        upsert: true,
        onUploadProgress: (p) => {
          const percent = Math.round((p.loaded / p.total) * 100);
          setProgress(percent);
        },
      });

    if (uploadError) {
      alert("Lỗi upload: " + uploadError.message);
      setUploading(false);
      return;
    }

    // 2. Lấy public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // 3. Lưu vào bảng videos (cột name tùy bạn)
    const { error: dbError } = await supabase.from("videos").insert([
      {
        url: publicUrl,
        username: "Admin",
        likes: 0,
        comments: 0,
        views: 0,
      },
    ]);

    if (dbError) {
      alert("Lỗi DB: " + dbError.message);
    } else {
      alert("Upload thành công!");
    }

    setUploading(false);
    onDone(); // quay lại VideoFeed
  };

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2 className="text-xl font-bold mb-4">Upload Video</h2>

      {/* Chọn Bucket */}
      <label>Chọn Bucket:</label>
      <select
        className="text-black p-2 rounded mb-4 block"
        value={bucket}
        onChange={(e) => setBucket(e.target.value)}
      >
        {buckets.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      {/* Chọn file */}
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      {/* Tiến trình upload */}
      {uploading && (
        <div className="mt-3">
          <div>{progress}%</div>
          <div
            style={{
              background: "#444",
              height: 5,
              borderRadius: 4,
              marginTop: 5,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: 5,
                background: "#4ade80",
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Nút Upload */}
      {!uploading && (
        <button
          onClick={handleUpload}
          className="mt-4 bg-blue-500 px-4 py-2 rounded"
        >
          Upload
        </button>
      )}
    </div>
  );
}
