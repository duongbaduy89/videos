// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// === COMPONENTS ===
import Header from "./components/Header";
import VideoFeed from "./components/VideoFeed";

// === AUTH ===
import Login from "./components/Auth/Login";
import Signup from "./components/Auth/Signup";

// === PAGES ===
import Upload from "./pages/Upload";
import Profile from "./pages/Profile";
import NotificationsPage from "./pages/NotificationsPage";

// === FRIEND SYSTEM ===
import FriendsPage from "./pages/FriendsPage";             // Danh sách bạn bè
import FriendRequestsPage from "./pages/FriendRequestsPage"; // Lời mời kết bạn

// === MESSAGING ===
import ChatRoom from "./pages/ChatRoom"; // Chat realtime

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* HEADER xuất hiện mọi trang */}
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

          {/* FRIENDS SYSTEM */}
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/friend-requests" element={<FriendRequestsPage />} />

          {/* MESSAGING 1–1 */}
          <Route path="/chat/:id" element={<ChatRoom />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
