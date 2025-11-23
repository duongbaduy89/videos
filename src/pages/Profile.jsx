import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import TwitterVideoPlayer from "../components/TwitterVideoPlayer";

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollowState, setLoadingFollowState] = useState(true);

  useEffect(() => {
    loadProfile();
    loadVideos();
    checkFollowState();
  }, [id, user]);

  // ===========================
  // 1) Load thông tin Profile
  // ===========================
  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(data);
  };

  // ===========================
  // 2) Load video của user
  // ===========================
  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setVideos(data || []);
  };

  // ===========================
  // 3) Kiểm tra follow chính xác
  // ===========================
  const checkFollowState = async () => {
    if (!user || user.id === id) {
      setIsFollowing(false);
      setLoadingFollowState(false);
      return;
    }

    const { data } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", user.id)
      .eq("following_id", id)
      .maybeSingle();

    setIsFollowing(!!data);
    setLoadingFollowState(false);
  };

  // ===========================
  // 4) Follow / Unfollow
  // ===========================
  const handleFollow = async () => {
    if (!user) return alert("Bạn cần đăng nhập để follow!");

    if (!isFollowing) {
      // FOLLOW
      await supabase.from("follows").insert([
        { follower_id: user.id, following_id: id },
      ]);

      await supabase.rpc("increment_followers", { user_id: id });
      await supabase.rpc("increment_following", { user_id: user.id });
    } else {
      // UNFOLLOW
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", id);

      await supabase.rpc("decrement_followers", { user_id: id });
      await supabase.rpc("decrement_following", { user_id: user.id });
    }

    // Reload lại dữ liệu
    await loadProfile();
    await checkFollowState();
  };

  if (!profile) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* ===================== HEADER PROFILE ===================== */}
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <div>
          <h2>@{profile.username}</h2>
          <p>{profile.bio || "Chưa có mô tả"}</p>

          {/* Lượt follow */}
          <div style={{ marginTop: 5, opacity: 0.8 }}>
            Followers: {profile.followers_count || 0} | Following:{" "}
            {profile.following_count || 0}
          </div>

          {/* ===================== NÚT FOLLOW ===================== */}
          {!loadingFollowState &&
            user &&
            user.id !== id && ( // Ẩn khi xem trang của mình
              <button
                onClick={handleFollow}
                style={{
                  marginTop: 8,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: isFollowing ? "#555" : "#ff0050",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {isFollowing ? "Đang Follow" : "Follow"}
              </button>
            )}
        </div>
      </div>

      <hr style={{ margin: "20px 0", borderColor: "#444" }} />

      {/* ===================== DANH SÁCH VIDEO ===================== */}
      <h3>Video của @{profile.username}</h3>

      {videos.map((v) => (
        <div key={v.id} style={{ marginTop: 20 }}>
          <TwitterVideoPlayer videoUrl={v.url} autoPlayEnabled={false} />
          <p style={{ marginTop: 8 }}>{v.title}</p>
        </div>
      ))}
    </div>
  );
}
