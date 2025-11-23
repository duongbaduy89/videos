// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Header from "./components/Header";
import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";

import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    const { data: raw, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Lỗi load video:", error);
      setLoading(false);
      return;
    }

    // CHẶN VIDEO KHÔNG CÓ user_id (tránh lỗi id=null)
    const clean = raw.filter(v => v.user_id);

    // Lấy profile của chủ video
    const videosWithProfile = await Promise.all(
      clean.map(async (v) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", v.user_id)
          .maybeSingle();

        return {
          ...v,
          profiles: profile || null,
        };
      })
    );

    setVideos(videosWithProfile);
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();

    const channel = supabase
      .channel("videos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => loadVideos()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) {
    return <div style={{ color: "white", padding: 20 }}>Đang tải video...</div>;
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<VideoFeed videos={videos} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/profile/:id" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
