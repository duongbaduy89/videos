// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Header from "./components/Header";
import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Upload from "./pages/Upload";

import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

export default function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false }); // NEWEST FIRST

    if (!error) setVideos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();

    // Auto reload when database changes
    const channel = supabase
      .channel("videos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => loadVideos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ color: "white", padding: 20 }}>
        Đang tải video...
      </div>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />  {/* 🔥 THÊM HEADER TẠI ĐÂY */}

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
