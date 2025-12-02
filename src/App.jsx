import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Header from "./components/Header";
import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/NotificationsPage";

// === NEW PAGES FOR FRIENDS & MESSAGING ===
import FriendsPage from "./pages/FriendsPage";
import ChatRoom from "./pages/ChatRoom";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />

        <Routes>
          {/* HOME FEED */}
          <Route path="/" element={<VideoFeed />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* PROFILE & UPLOAD */}
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/upload" element={<Upload />} />

          {/* NOTIFICATIONS */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* === FRIENDS SYSTEM === */}
          <Route path="/friends" element={<FriendsPage />} />

          {/* === MESSAGING 1–1 === */}
          <Route path="/chat/:id" element={<ChatRoom />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
