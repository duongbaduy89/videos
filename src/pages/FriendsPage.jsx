// src/pages/FriendsPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;
    // get rows where status accepted and either user_id or friend_id equals current user
    const { data, error } = await supabase
      .from("friends")
      .select("id, user_id, friend_id, created_at, friend:profiles!friend_id(username,avatar_url), user:profiles!user_id(username,avatar_url)")
      .or(`and(user_id.eq.${user.id},status.eq.accepted),and(friend_id.eq.${user.id},status.eq.accepted)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadFriends error", error);
      return;
    }

    // map to friend info (other user)
    const arr = (data || []).map((r) => {
      const other = r.user_id === user.id ? r.friend : r.user;
      return { id: r.id, otherId: other?.id || (r.friend_id === user.id ? r.user_id : r.friend_id), username: other?.username, avatar: other?.avatar_url };
    });

    setFriends(arr);
  };

  const unfriend = async (rowId) => {
    try {
      await supabase.from("friends").delete().eq("id", rowId);
      loadFriends();
    } catch (err) {
      console.error("unfriend error", err);
    }
  };

  const openChat = async (otherId) => {
    // create or open conversation
    const userA = user.id < otherId ? user.id : otherId;
    const userB = user.id < otherId ? otherId : user.id;

    const { data: exist } = await supabase.from("conversations").select("*").eq("user_a", userA).eq("user_b", userB).maybeSingle();
    if (exist) {
      navigate(`/chat/${exist.id}`);
      return;
    }
    const { data } = await supabase.from("conversations").insert([{ user_a: userA, user_b: userB }]).select().single();
    navigate(`/chat/${data.id}`);
  };

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Danh sách bạn bè</h2>
      {friends.length === 0 && <div style={{ color: "#9ca3af" }}>Bạn chưa có bạn bè.</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {friends.map((f) => (
          <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: "1px solid #1f2937", borderRadius: 8 }}>
            <img src={f.avatar || "/default-avatar.png"} alt="a" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>@{f.username}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openChat(f.otherId)} style={{ padding: "6px 10px", borderRadius: 8, background: "#0ea5e9", border: "none", cursor: "pointer" }}>Nhắn tin</button>
              <button onClick={() => unfriend(f.id)} style={{ padding: "6px 10px", borderRadius: 8, background: "#ef4444", border: "none", cursor: "pointer", color: "white" }}>Hủy kết bạn</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
