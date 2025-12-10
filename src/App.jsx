// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import XBottomNav from "./components/XBottomNav";
import ProfileSidebar from "./components/ProfileSidebar";

import VideoFeed from "./components/VideoFeed/VideoFeed";
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

import Upload from "./pages/Upload";
import CreatePost from "./pages/CreatePost"; // ✅ Import CreatePost
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/NotificationsPage";
import FriendsPage from "./pages/FriendsPage";
import FriendRequestsPage from "./pages/FriendRequestsPage";
import ChatRoom from "./pages/ChatRoom";
import MessagesPage from "./pages/MessagesPage";

import "./styles/messages.css";
import "./styles/xnav.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        {/* Sidebar + avatar */}
        <ProfileSidebar />

        <Routes>
          <Route path="/" element={<VideoFeed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/createpost" element={<CreatePost />} /> {/* ✅ Route CreatePost */}

          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friend-requests" element={<FriendRequestsPage />} />

          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/chat/:user_id" element={<ChatRoom />} />
        </Routes>

        <XBottomNav />
      </BrowserRouter>
    </AuthProvider>
  );
}
