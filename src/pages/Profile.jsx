// src/pages/Profile.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

/**
 * Profile page
 * - Hiển thị profile
 * - Kết bạn (Facebook style: gửi lời mời -> người nhận chấp nhận -> thành friends)
 * - Realtime cập nhật trạng thái lời mời / accept
 * - Hiển thị video (6 / trang) + phân trang 1 2 3 ...
 *
 * Ghi chú:
 * - WORKER_UPLOAD_URL: bạn dùng upload avatar worker (đã có)
 */

export default function Profile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  // friends state
  const [friendRelation, setFriendRelation] = useState(null);
  // friendRelation: null | { id, user_id, friend_id, status }

  // videos & pagination
  const PAGE_SIZE = 6;
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalVideos / PAGE_SIZE));

  // edit profile
  const [editing, setEditing] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [newAvatar, setNewAvatar] = useState(null);

  // Worker upload avatar của bạn
  const WORKER_UPLOAD_URL = "https://uploadavatar.dataphim002.workers.dev";

  const friendsChannelRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadFriendRelation();
    loadVideos(1);
    // subscribe friend table updates for realtime on this profile
    subscribeFriendsRealtime();

    return () => {
      // cleanup channel
      if (friendsChannelRef.current) {
        supabase.removeChannel(friendsChannelRef.current);
        friendsChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // reload videos when page changes
  useEffect(() => {
    loadVideos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ===============================
  // Load profile data
  // ===============================
  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("loadProfile error", error);
        return;
      }
      setProfile(data);
      setNewBio(data?.bio || "");
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // Load friend relation between current user and profile.user
  // ===============================
  const loadFriendRelation = async () => {
    if (!user) {
      setFriendRelation(null);
      return;
    }
    try {
      // check both directions
      const { data, error } = await supabase
        .from("friends")
        .select("*")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`
        )
        .maybeSingle();

      if (error) {
        console.error("loadFriendRelation", error);
        return;
      }
      setFriendRelation(data || null);
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // Subscribe friends realtime (for this profile)
  // ===============================
  const subscribeFriendsRealtime = () => {
    if (!user) return;

    // unsubscribe previous if exists
    if (friendsChannelRef.current) {
      supabase.removeChannel(friendsChannelRef.current);
      friendsChannelRef.current = null;
    }

    const channel = supabase
      .channel(`friends-profile-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${id}` },
        (payload) => {
          // If a new friend request is created for this profile, reload relation
          loadFriendRelation();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `friend_id=eq.${id}` },
        (payload) => {
          loadFriendRelation();
        }
      )
      .subscribe();

    friendsChannelRef.current = channel;
  };

  // ===============================
  // Load videos with pagination
  // ===============================
  const loadVideos = async (pageToLoad = 1) => {
    try {
      const from = (pageToLoad - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const q = supabase
        .from("videos")
        .select("*", { count: "exact" })
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .range(from, to);

      const { data, count, error } = await q;
      if (error) {
        console.error("loadVideos", error);
        return;
      }
      setVideos(data || []);
      setTotalVideos(count || (data ? data.length : 0));
      setPage(pageToLoad);
    } catch (err) {
      console.error(err);
    }
  };

  // helper create notification
  const createNotification = async (targetUserId, type, payload = {}) => {
    try {
      await supabase.from("notifications").insert([
        {
          user_id: targetUserId,
          sender_id: user?.id || null,
          type,
          data: payload,
        },
      ]);
    } catch (err) {
      console.error("createNotification err", err);
    }
  };

  // ===============================
  // Friend actions (Facebook style)
  // - send request (user -> profile)
  // - accept request (profile -> user)  *when you are profile and accept request from visitor*
  // - cancel request (withdraw)
  // - unfriend
  // ===============================
  const sendFriendRequest = async () => {
    if (!user) return alert("Bạn cần đăng nhập");
    try {
      // check already exists
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
      setFriendRelation(data);

      // create notification for the receiver
      await createNotification(id, "friend_request", { from: user.id });
    } catch (err) {
      console.error("sendFriendRequest", err);
      alert("Gửi lời mời thất bại");
    }
  };

  const cancelFriendRequest = async () => {
    if (!user || !friendRelation) return;
    try {
      // only requester can delete own request or either can delete if desired
      await supabase.from("friends").delete().eq("id", friendRelation.id);
      setFriendRelation(null);
    } catch (err) {
      console.error(err);
    }
  };

  const acceptFriendRequest = async () => {
    if (!user || !friendRelation) return;
    try {
      // we expect current user is the friend_id (receiver) when accepting
      await supabase.from("friends").update({ status: "accepted" }).eq("id", friendRelation.id);

      // update local state
      setFriendRelation({ ...friendRelation, status: "accepted" });

      // update followers_count / following_count (increment both users)
      await supabase
        .from("profiles")
        .update({ followers_count: supabase.raw("coalesce(followers_count,0) + 1") })
        .eq("id", id); // profile being viewed gets +1 follower

      await supabase
        .from("profiles")
        .update({ following_count: supabase.raw("coalesce(following_count,0) + 1") })
        .eq("id", user.id);

      // create notification to original requester that their request was accepted
      const requesterId = friendRelation.user_id === user.id ? friendRelation.friend_id : friendRelation.user_id;
      // Determine requester from stored relation:
      const requester = friendRelation.user_id === user.id ? friendRelation.friend_id : friendRelation.user_id;

      // But safer: get requester = friendRelation.user_id (who sent originally)
      const originalRequester = friendRelation.user_id;

      await createNotification(originalRequester, "friend_accept", { by: user.id });
    } catch (err) {
      console.error("acceptFriendRequest", err);
    }
  };

  const unfriend = async () => {
    if (!user || !friendRelation) return;
    try {
      await supabase.from("friends").delete().eq("id", friendRelation.id);
      setFriendRelation(null);

      // decrement counts (safe approach: set to coalesce-1)
      await supabase
        .from("profiles")
        .update({ followers_count: supabase.raw("GREATEST(coalesce(followers_count,0) - 1, 0)") })
        .eq("id", id);

      await supabase
        .from("profiles")
        .update({ following_count: supabase.raw("GREATEST(coalesce(following_count,0) - 1, 0)") })
        .eq("id", user.id);
    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // Update profile (avatar upload + bio)
  // ===============================
  const updateProfile = async () => {
    let avatar_url = profile.avatar_url;

    // Nếu có chọn avatar mới → upload lên Cloudflare Worker
    if (newAvatar) {
      try {
        const formData = new FormData();
        formData.append("file", newAvatar);
        formData.append("folder", "avatar/");

        const res = await fetch(WORKER_UPLOAD_URL, {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        if (!result.success && !result.publicUrl) {
          // support both success flag or direct public URL format
          alert("Upload avatar thất bại!");
          return;
        }

        avatar_url = result.publicUrl || result.url || result.publicUrl;
      } catch (err) {
        console.error(err);
        alert("Lỗi upload avatar lên Cloudflare R2");
        return;
      }
    }

    // Cập nhật Supabase Database
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: newBio,
        avatar_url,
      })
      .eq("id", id);

    if (error) {
      alert("Cập nhật thất bại");
      console.error(error);
      return;
    }

    setEditing(false);
    loadProfile();
  };

  // ===============================
  // Helper: render friend action button
  // ===============================
  const renderFriendAction = () => {
    if (!user) return null;
    if (user.id === id) return null; // don't show on own profile

    if (!friendRelation) {
      // no relation -> show "Kết bạn"
      return (
        <button
          onClick={sendFriendRequest}
          style={{
            marginTop: 8,
            padding: "6px 14px",
            borderRadius: 8,
            background: "#0af",
            border: "none",
            color: "black",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Kết bạn
        </button>
      );
    }

    // relation exists
    if (friendRelation.status === "pending") {
      // two roles: if current user is receiver -> show accept; if current is sender -> show cancel
      if (friendRelation.friend_id === user.id) {
        return (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={acceptFriendRequest}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "#22c55e",
                border: "none",
                color: "black",
                cursor: "pointer",
              }}
            >
              Chấp nhận
            </button>
            <button
              onClick={cancelFriendRequest}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "#444",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              Từ chối
            </button>
          </div>
        );
      } else {
        // current user is requester
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ color: "#aaa", fontSize: 13 }}>Đã gửi lời mời</div>
            <button
              onClick={cancelFriendRequest}
              style={{
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 8,
                background: "#444",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              Hủy lời mời
            </button>
          </div>
        );
      }
    }

    if (friendRelation.status === "accepted") {
      return (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          <div style={{ color: "#a7f3d0", fontWeight: 600 }}>Bạn bè</div>
          <button
            onClick={unfriend}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "#ef4444",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Hủy kết bạn
          </button>
          <button
            onClick={() => {
              // start chat by creating conversation and navigating
              // simplest: navigate to messages list and let user open chat
              navigate("/messages");
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "#0ea5e9",
              border: "none",
              color: "black",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Nhắn tin
          </button>
        </div>
      );
    }

    return null;
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
          alt="avatar"
        />

        <div>
          <h2 style={{ margin: 0 }}>@{profile.username}</h2>
          <p style={{ margin: "6px 0", color: "#cbd5e1" }}>{profile.bio || "Chưa có mô tả"}</p>

          <div style={{ marginTop: 5, opacity: 0.9, color: "#94a3b8" }}>
            Followers: {profile.followers_count || 0} | Following: {profile.following_count || 0}
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            {user && user.id === id && (
              <button
                onClick={() => setEditing(true)}
                style={{
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

            {/* Friend action button(s) */}
            {renderFriendAction()}
          </div>
        </div>
      </div>

      {/* ===================== POPUP EDIT PROFILE ===================== */}
      {editing && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: "#111827",
            borderRadius: 10,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Chỉnh sửa hồ sơ</h3>

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
              background: "#0b1220",
              color: "white",
              border: "1px solid #23303b",
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
                color: "black",
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

      <hr style={{ margin: "20px 0", borderColor: "#2d3748" }} />

      {/* ===================== VIDEO LIST ===================== */}
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

      {/* Pagination */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {Array.from({ length: totalPages }).map((_, idx) => {
          const p = idx + 1;
          return (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: "6px 10px",
                background: p === page ? "#0af" : "transparent",
                color: p === page ? "black" : "#9ca3af",
                borderRadius: 6,
                border: "1px solid #263241",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
