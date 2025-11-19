import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { supabaseClone1, supabaseClone2 } from "../supabaseClones";

export default function Upload() {
  const [videoFile, setVideoFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");

  const [bucketTarget, setBucketTarget] = useState("clone1");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const getSupabaseClient = () => {
    return bucketTarget === "clone1" ? supabaseClone1 : supabaseClone2;
  };

  const handleUpload = async () => {
    if (!videoFile) {
      alert("Chọn video trước!");
      return;
    }
    if (!title.trim()) {
      alert("Bạn cần nhập tiêu đề!");
      return;
    }

    setUploading(true);
    const client = getSupabaseClient();

    const fileName = `${Date.now()}-${videoFile.name}`;

    // 👉 FIX QUAN TRỌNG: bucket phải là videoss
    const { error: uploadErr } = await client.storage
      .from("videoss")
      .upload(fileName, videoFile, { upsert: true });

    if (uploadErr) {
      alert("❌ Upload thất bại!");
      console.error(uploadErr);
      setUploading(false);
      return;
    }

    // Lấy URL công khai
    const { data: publicData } = client.storage
      .from("videoss")
      .getPublicUrl(fileName);

    const videoURL = publicData.publicUrl;

    // Insert metadata vào Supabase chính
    const { error: insertErr } = await supabase.from("videos").insert([
      {
        url: videoURL,
        title: title,
        description: desc,
        category: category,
      },
    ]);

    if (insertErr) {
      alert("❌ Lưu metadata thất bại!");
      console.error(insertErr);
      setUploading(false);
      return;
    }

    alert("✅ Upload thành công!");
    setUploading(false);
    setVideoFile(null);
    setPreview("");
    setTitle("");
    setDesc("");
    setCategory("");
  };

  return (
    <div className="min-h-screen bg-black text-white flex justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 rounded-xl p-6 shadow-lg">

        <h1 className="text-2xl font-bold mb-5 text-center">Upload Video</h1>

        {/* Chọn file */}
        <div className="mb-5">
          <label className="font-semibold">Chọn video MP4:</label>
          <input
            type="file"
            accept="video/mp4"
            onChange={handleFileChange}
            className="mt-2 w-full text-sm"
          />

          {preview && (
            <video
              src={preview}
              controls
              className="mt-3 rounded-lg w-full max-h-64"
            />
          )}
        </div>

        {/* Chọn Supabase Clone */}
        <div className="mb-5">
          <label className="font-semibold">Chọn bucket upload:</label>
          <select
            value={bucketTarget}
            onChange={(e) => setBucketTarget(e.target.value)}
            className="bg-zinc-800 p-2 rounded-lg mt-2 w-full"
          >
            <option value="clone1">Supabase Clone 1</option>
            <option value="clone2">Supabase Clone 2</option>
          </select>
        </div>

        {/* Tiêu đề */}
        <div className="mb-5">
          <label className="font-semibold">Tiêu đề video:</label>
          <input
            className="w-full bg-zinc-800 p-3 rounded-lg mt-2"
            placeholder="Nhập tiêu đề video..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Mô tả */}
        <div className="mb-5">
          <label className="font-semibold">Mô tả:</label>
          <textarea
            className="w-full bg-zinc-800 p-3 rounded-lg mt-2"
            rows={3}
            placeholder="Mô tả nội dung video"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Thể loại */}
        <div className="mb-6">
          <label className="font-semibold">Thể loại:</label>
          <input
            className="w-full bg-zinc-800 p-3 rounded-lg mt-2"
            placeholder="funny, anime, vlog..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* Nút upload */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg text-lg font-bold"
        >
          {uploading ? "Đang upload..." : "Upload Video"}
        </button>
      </div>
    </div>
  );
}
