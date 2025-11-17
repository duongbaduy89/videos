// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import UploadVideo from "./components/UploadVideo";
import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch video từ Supabase
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

  if (loading) return <div style={{ color: "white", padding: 20 }}>Đang tải video...</div>;

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* TRUYỀN videos vào VideoFeed */}
          <Route path="/" element={<VideoFeed videos={videos} />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/upload" element={<UploadVideo />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
