import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(false);

  const [newBio, setNewBio] = useState("");
  const [newAvatar, setNewAvatar] = useState(null);

  useEffect(() => {
    loadProfile();
    loadVideos();
  }, [id]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(data);
    setNewBio(data?.bio || "");
  };

  const loadVideos = async () => {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setVideos(data || []);
  };

  // ============================
  //     UPDATE PROFILE
  // ============================
  const updateProfile = async () => {
    let avatar_url = profile.avatar_url;

    // Upload avatar nếu user chọn avatar mới
    if (newAvatar) {
      const fileExt = newAvatar.name.split(".").pop();
      const fileName = `${id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, newAvatar, {
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        alert("Upload avatar thất bại.");
        return;
      }

      const { data: publicURL } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatar_url = publicURL.publicUrl;
    }

    // Update Supabase Database
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: newBio,
        avatar_url,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Cập nhật thất bại");
      return;
    }

    setEditing(false);
    loadProfile();
  };

  if (!profile) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* ===================== HEADER ===================== */}
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

          {/* Followers / Following */}
          <div style={{ marginTop: 5, opacity: 0.8 }}>
            Followers: {profile.followers_count || 0} | Following:{" "}
            {profile.following_count || 0}
          </div>

          {/* Chỉ hiện nút khi xem chính profile của mình */}
          {user && user.id === id && (
            <button
              onClick={() => setEditing(true)}
              style={{
                marginTop: 8,
                padding: "6px 14px",
                borderRadius: 8,
                background: "#555",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Chỉnh sửa hồ sơ
            </button>
          )}
        </div>
      </div>

      {/* ===================== POPUP EDIT PROFILE ===================== */}
      {editing && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: "#222",
            borderRadius: 10,
          }}
        >
          <h3>Chỉnh sửa hồ sơ</h3>

          {/* Avatar Upload */}
          <label>Avatar mới:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewAvatar(e.target.files[0])}
            style={{ display: "block", marginTop: 10 }}
          />

          {/* Bio */}
          <label style={{ marginTop: 15, display: "block" }}>Bio:</label>
          <textarea
            value={newBio}
            onChange={(e) => setNewBio(e.target.value)}
            style={{
              width: "100%",
              height: 80,
              padding: 10,
              borderRadius: 8,
              marginTop: 5,
            }}
          />

          {/* Buttons */}
          <div style={{ marginTop: 10 }}>
            <button
              onClick={updateProfile}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: "#0af",
                border: "none",
                color: "white",
                cursor: "pointer",
                marginRight: 10,
              }}
            >
              Lưu thay đổi
            </button>

            <button
              onClick={() => setEditing(false)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: "#444",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <hr style={{ margin: "20px 0", borderColor: "#444" }} />

      {/* ===================== VIDEO LIST ===================== */}
      <h3>Video của @{profile.username}</h3>

      {videos.map((v) => (
        <div key={v.id} style={{ marginTop: 20 }}>
          <video
            src={v.url}
            controls
            style={{ width: "100%", borderRadius: 10 }}
          />
          <p style={{ marginTop: 8 }}>{v.title}</p>
        </div>
      ))}
    </div>
  );
}
