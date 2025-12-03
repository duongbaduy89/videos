// src/pages/FriendRequestsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function FriendRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const realtimeRef = useRef(null);

  useEffect(() => {
    loadRequests();

    if (!user) return;
    // realtime subscribe for notifications / friends table
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);

    const ch = supabase
      .channel(`friend-requests-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friends", filter: `friend_id=eq.${user.id}` },
        (payload) => {
          loadRequests();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friends", filter: `friend_id=eq.${user.id}` },
        (payload) => {
          loadRequests();
        }
      )
      .subscribe();

    realtimeRef.current = ch;
    return () => {
      if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("friends")
      .select("id, user_id, friend_id, status, created_at, user:profiles!user_id(username,avatar_url)")
      .eq("friend_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadRequests err", error);
      return;
    }
    setRequests(data || []);
  };

  const accept = async (r) => {
    try {
      const { data, error } = await supabase.from("friends").update({ status: "accepted" }).eq("id", r.id).select().single();
      if (error) throw error;
      // create notification
      await supabase.from("notifications").insert([{ user_id: r.user_id, sender_id: user.id, type: "friend_accept", data: { by: user.id } }]);
      loadRequests();
    } catch (err) {
      console.error("accept err", err);
    }
  };

  const decline = async (r) => {
    try {
      await supabase.from("friends").delete().eq("id", r.id);
      loadRequests();
    } catch (err) {
      console.error("decline err", err);
    }
  };

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Lời mời kết bạn</h2>
      {requests.length === 0 && <div style={{ color: "#9ca3af" }}>Bạn không có lời mời nào.</div>}
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {requests.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, border: "1px solid #1f2937", borderRadius: 8 }}>
            <img src={r.user?.avatar_url || "/default-avatar.png"} alt="a" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>@{r.user?.username || "someone"}</div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => accept(r)} style={{ padding: "6px 10px", borderRadius: 8, background: "#22c55e", border: "none", cursor: "pointer" }}>Chấp nhận</button>
              <button onClick={() => decline(r)} style={{ padding: "6px 10px", borderRadius: 8, background: "#444", border: "none", cursor: "pointer", color: "white" }}>Từ chối</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
