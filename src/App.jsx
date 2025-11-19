// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

// ❗ Trang upload mới từ thư mục /pages
import Upload from "./pages/Upload";

import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideos = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .order("id", { ascending: true });

      if (!error) setVideos(data);
      setLoading(false);
    };

    loadVideos();
  }, []);

  if (loading)
    return (
      <div style={{ color: "white", padding: 20 }}>
        Đang tải video...
      </div>
    );

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Trang Video chính */}
          <Route path="/" element={<VideoFeed videos={videos} />} />

          {/* Login / Signup */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* ❗ Trang Upload UI mới */}
          <Route path="/upload" element={<Upload />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
