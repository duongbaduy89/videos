import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import TwitterVideoPlayer from "../components/TwitterVideoPlayer";

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    loadProfile();
    loadVideos();
  }, [id]);

  const loadProfile = async () => {
    let { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    setProfile(data);
  };

  const loadVideos = async () => {
    let { data } = await supabase
      .from("videos")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    setVideos(data || []);
  };

  if (!profile) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, color: "white" }}>
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

          <div style={{ marginTop: 5, opacity: 0.8 }}>
            Followers: {profile.followers_count || 0} | Following:{" "}
            {profile.following_count || 0}
          </div>
        </div>
      </div>

      <hr style={{ margin: "20px 0", borderColor: "#444" }} />

      <h3>Video của @{profile.username}</h3>

      {videos.map((v) => (
        <div key={v.id} style={{ marginTop: 20 }}>
          <TwitterVideoPlayer
            videoUrl={v.url}
            autoPlayEnabled={false}
          />
          <p style={{ marginTop: 8 }}>{v.title}</p>
        </div>
      ))}
    </div>
  );
}
