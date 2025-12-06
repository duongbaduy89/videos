// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// ❌ TẠM THỜI BỎ HEADER
// import Header from "./components/Header";

import XBottomNav from "./components/XBottomNav";

import VideoFeed from "./components/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/NotificationsPage";
import FriendsPage from "./pages/FriendsPage";
import FriendRequestsPage from "./pages/FriendRequestsPage";
import ChatRoom from "./pages/ChatRoom";
import MessagesPage from "./pages/MessagesPage";

import "./styles/messages.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        {/* ❌ VÔ HIỆU HÓA HEADER */}
        {/* <Header /> */}

        <Routes>
          <Route path="/" element={<VideoFeed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/upload" element={<Upload />} />

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friend-requests" element={<FriendRequestsPage />} />

          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/chat/:user_id" element={<ChatRoom />} />
        </Routes>

        {/* ⭐ giữ thanh điều hướng X */}
        <XBottomNav />

      </BrowserRouter>
    </AuthProvider>
  );
}
