// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import VideoFeed from "./components/VideoFeed";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Upload from "./pages/Upload";

import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Load video mỗi lần mở trang → KHÔNG CACHE
  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Load videos error:", error);
    } else {
      setVideos(data || []);
    }

    setLoading(false);
  };

  // 🔥 Load lần đầu
  useEffect(() => {
    loadVideos();
  }, []);

  // 🔥 Realtime mode: khi có video mới → tự thêm vào list
  useEffect(() => {
    const channel = supabase
      .channel("videos-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "videos" },
        (payload) => {
          setVideos((old) => [...old, payload.new]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
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
          <Route path="/" element={<VideoFeed videos={videos} />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/upload" element={<Upload />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
