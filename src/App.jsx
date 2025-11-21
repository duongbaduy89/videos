import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Upload from "./pages/Upload";

import Header from "./components/Header";

import { supabase } from "./supabaseClient";
import { useEffect, useState } from "react";

function Layout({ children }) {
  const location = useLocation();

  // Ẩn header ở các trang login/signup
  const hideHeader =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}

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
        <Layout>
          <Routes>
            <Route path="/" element={<VideoFeed videos={videos} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
