// src/pages/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { id } = useParams(); // id của profile đang xem
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [friendRelation, setFriendRelation] = useState(null);
  const [videos, setVideos] = useState([]);
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalVideos / PAGE_SIZE));

  const [editing, setEditing] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [newAvatar, setNewAvatar] = useState(null);
  const WORKER_UPLOAD_URL = "https://uploadavatar.dataphim002.workers.dev";

  const realtimeRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadFriendRelation();
    loadVideos(1);
    subscribeRealtime();

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    loadVideos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ----------------- load profile -----------------
  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        console.error("loadProfile error:", error);
        return;
      }
      setProfile(data);
      setNewBio(data?.bio || "");
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------- load friend relation -----------------
  const loadFriendRelation = async () => {
    if (!user) {
      setFriendRelation(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("friends")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`
        )
        .maybeSingle();

      if (error) {
        console.error("loadFriendRelation error:", error);
        return;
      }
      if (!data) {
        setFriendRelation(null);
        return;
      }

      const relation = { ...data };
      if (relation.status === "pending") {
        relation.direction = relation.user_id === user.id ? "sent" : "received";
      } else if (relation.status === "accepted") {
        relation.direction = "friends";
      }
      setFriendRelation(relation);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------- realtime subscribe -----------------
  const subscribeRealtime = () => {
    if (!user) return;
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);

    const ch = supabase
      .channel(`profile-${id}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${id}` },
        () => loadFriendRelation()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `friend_id=eq.${id}` },
        () => loadFriendRelation()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log("new notification", payload.new);
        }
      )
      .subscribe();

    realtimeRef.current = ch;
  };

  // ----------------- load videos -----------------
  const loadVideos = async (pageToLoad = 1) => {
    try {
      const from = (pageToLoad - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from("videos")
        .select("*", { count: "exact" })
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        console.error("loadVideos error:", error);
        return;
      }
      setVideos(data || []);
      setTotalVideos(count ?? (data ? data.length : 0));
      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------- notifications helper -----------------
  const createNotification = async (targetUserId, type, videoId = null, commentId = null) => {
    if (!user) return;
    try {
      await supabase.from("notifications").insert([
        {
          user_id: targetUserId,
          from_user_id: user.id,
          type,
          video_id: videoId,
          comment_id: commentId,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("createNotification error", err);
    }
  };

  // ----------------- friend actions -----------------
  const sendFriendRequest = async () => {
    if (!user) return alert("Bạn cần đăng nhập");
    try {
      const { data: exists } = await supabase
        .from("friends")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`
        )
        .maybeSingle();

      if (exists) {
        setFriendRelation(exists);
        return;
      }

      const { data, error } = await supabase
        .from("friends")
        .insert([{ user_id: user.id, friend_id: id, status: "pending" }])
        .select()
        .single();

      if (error) throw error;
      setFriendRelation({ ...data, direction: "sent" });
      await createNotification(id, "friend_request");
    } catch (err) {
      console.error(err);
      alert("Gửi lời mời thất bại");
    }
  };

  const cancelFriendRequest = async () => {
    if (!user || !friendRelation) return;
    try {
      await supabase.from("friends").delete().eq("id", friendRelation.id);
      setFriendRelation(null);
    } catch (err) {
      console.error(err);
      alert("Hủy thất bại");
    }
  };

  const acceptFriendRequest = async () => {
    if (!user || !friendRelation) return;
    try {
      const { data, error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", friendRelation.id)
        .select()
        .single();
      if (error) throw error;

      setFriendRelation({ ...data, direction: "friends" });

      await supabase
        .from("profiles")
        .update({ followers_count: supabase.raw("coalesce(followers_count,0) + 1") })
        .eq("id", id);
      await supabase
        .from("profiles")
        .update({ following_count: supabase.raw("coalesce(following_count,0) + 1") })
        .eq("id", user.id);

      const originalRequester = data.user_id;
      await createNotification(originalRequester, "friend_accept");
    } catch (err) {
      console.error(err);
      alert("Chấp nhận thất bại");
    }
  };

  const unfriend = async () => {
    if (!user || !friendRelation) return;
    try {
      await supabase.from("friends").delete().eq("id", friendRelation.id);
      setFriendRelation(null);
      await supabase
        .from("profiles")
        .update({ followers_count: supabase.raw("GREATEST(coalesce(followers_count,0)-1,0)") })
        .eq("id", id);
      await supabase
        .from("profiles")
        .update({ following_count: supabase.raw("GREATEST(coalesce(following_count,0)-1,0)") })
        .eq("id", user.id);
    } catch (err) {
      console.error(err);
      alert("Hủy bạn thất bại");
    }
  };

  // ----------------- profile update -----------------
  const updateProfile = async () => {
    let avatar_url = profile.avatar_url;
    if (newAvatar) {
      try {
        const formData = new FormData();
        formData.append("file", newAvatar);
        formData.append("folder", "avatar/");
        const res = await fetch(WORKER_UPLOAD_URL, { method: "POST", body: formData });
        const result = await res.json();
        avatar_url = result.publicUrl || result.url || avatar_url;
      } catch (err) {
        console.error(err);
        alert("Upload avatar thất bại");
        return;
      }
    }
    const { error } = await supabase.from("profiles").update({ bio: newBio, avatar_url }).eq("id", id);
    if (error) return alert("Cập nhật thất bại");
    setEditing(false);
    loadProfile();
  };

  // ----------------- render friend action -----------------
  const renderFriendAction = () => {
    if (!user || user.id === id) return null;

    if (!friendRelation) {
      return (
        <button onClick={sendFriendRequest} style={btnStylePrimary}>
          Kết bạn
        </button>
      );
    }

    if (friendRelation.status === "pending") {
      if (friendRelation.direction === "received" || friendRelation.friend_id === user.id) {
        return (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={acceptFriendRequest} style={btnGreen}>
              Chấp nhận
            </button>
            <button onClick={cancelFriendRequest} style={btnGray}>
              Từ chối
            </button>
          </div>
        );
      } else {
        return (
          <div>
            <div style={{ color: "#aaa", fontSize: 13 }}>Đã gửi lời mời</div>
            <button onClick={cancelFriendRequest} style={btnGray}>
              Hủy lời mời
            </button>
          </div>
        );
      }
    }

    if (friendRelation.status === "accepted") {
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ color: "#a7f3d0", fontWeight: 600 }}>Bạn bè</div>
          <button onClick={unfriend} style={btnRed}>
            Hủy kết bạn
          </button>

          {/* 🔥 CHỈ NAVIGATE SANG ChatRoom với param user_id */}
          <button
            onClick={() => navigate(`/chat/${id}`)}
            style={btnBlue}
          >
            Nhắn tin
          </button>
        </div>
      );
    }

    return null;
  };

  const btnStylePrimary = {
    marginTop: 8,
    padding: "6px 14px",
    borderRadius: 8,
    background: "#0af",
    border: "none",
    color: "black",
    cursor: "pointer",
    fontSize: 14,
  };
  const btnGreen = { padding: "6px 12px", borderRadius: 8, background: "#22c55e", border: "none", color: "black", cursor: "pointer" };
  const btnGray = { padding: "6px 12px", borderRadius: 8, background: "#444", border: "none", color: "white", cursor: "pointer" };
  const btnRed = { padding: "6px 10px", borderRadius: 8, background: "#ef4444", border: "none", color: "white", cursor: "pointer", fontSize: 13 };
  const btnBlue = { padding: "6px 10px", borderRadius: 8, background: "#0ea5e9", border: "none", color: "black", cursor: "pointer", fontSize: 13 };

  if (!profile) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div style={{ padding: 20, color: "white" }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          alt="avatar"
          style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <h2 style={{ margin: 0 }}>@{profile.username}</h2>
          <p style={{ margin: "6px 0", color: "#cbd5e1" }}>{profile.bio || "Chưa có mô tả"}</p>
          <div style={{ marginTop: 5, opacity: 0.9, color: "#94a3b8" }}>
            Followers: {profile.followers_count || 0} | Following: {profile.following_count || 0}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {user && user.id === id && (
              <button onClick={() => setEditing(true)} style={{ padding: "6px 14px", borderRadius: 8, background: "#555", border: "none", color: "white", cursor: "pointer", fontSize: 14 }}>
                Chỉnh sửa hồ sơ
              </button>
            )}
            {renderFriendAction()}
          </div>
        </div>
      </div>

      {/* EDIT POPUP */}
      {editing && (
        <div style={{ marginTop: 20, padding: 15, background: "#111827", borderRadius: 10 }}>
          <h3 style={{ marginTop: 0 }}>Chỉnh sửa hồ sơ</h3>
          <label>Avatar mới:</label>
          <input type="file" accept="image/*" onChange={(e) => setNewAvatar(e.target.files[0])} style={{ display: "block", marginTop: 10 }} />
          <label style={{ marginTop: 15, display: "block" }}>Bio:</label>
          <textarea value={newBio} onChange={(e) => setNewBio(e.target.value)} style={{ width: "100%", height: 80, padding: 10, borderRadius: 8, marginTop: 5, background: "#0b1220", color: "white", border: "1px solid #23303b" }} />
          <div style={{ marginTop: 10 }}>
            <button onClick={updateProfile} style={{ padding: "6px 14px", borderRadius: 8, background: "#0af", border: "none", color: "black", cursor: "pointer", marginRight: 10 }}>
              Lưu thay đổi
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: "6px 14px", borderRadius: 8, background: "#444", border: "none", color: "white", cursor: "pointer" }}>
              Hủy
            </button>
          </div>
        </div>
      )}

      <hr style={{ margin: "20px 0", borderColor: "#2d3748" }} />

      {/* VIDEOS */}
      <h3 style={{ marginBottom: 12 }}>Video của @{profile.username}</h3>
      {videos.length === 0 && <div style={{ color: "#94a3b8" }}>Chưa có video nào.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(1, minmax(0,1fr))", gap: 16 }}>
        {videos.map((v) => (
          <div key={v.id} style={{ marginTop: 0 }}>
            <video src={v.url} controls style={{ width: "100%", borderRadius: 10 }} />
            <p style={{ marginTop: 8 }}>{v.title}</p>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: p === page ? "#0af" : "transparent", color: p === page ? "black" : "#9ca3af", borderRadius: 6, border: "1px solid #263241", cursor: "pointer" }}>
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
