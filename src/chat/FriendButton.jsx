import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function FriendButton({ profileId }) {
  const { user } = useAuth();
  const [status, setStatus] = useState("none");

  useEffect(() => {
    if (!user) return;

    const loadStatus = async () => {
      const { data } = await supabase
        .from("friends")
        .select("*")
        .or(
          `user_id.eq.${user.id},friend_id.eq.${profileId}`
        )
        .or(
          `friend_id.eq.${user.id},user_id.eq.${profileId}`
        )
        .maybeSingle();

      if (!data) {
        setStatus("none");
      } else if (data.status === "pending" && data.user_id === user.id) {
        setStatus("request_sent");
      } else if (data.status === "pending" && data.friend_id === user.id) {
        setStatus("request_received");
      } else if (data.status === "accepted") {
        setStatus("friends");
      }
    };

    loadStatus();
  }, [user, profileId]);

  const sendRequest = async () => {
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: profileId }
    ]);
    setStatus("request_sent");
  };

  const accept = async () => {
    await supabase
      .from("friends")
      .update({ status: "accepted" })
      .or(
        `user_id.eq.${profileId},friend_id.eq.${user.id}`
      );
    setStatus("friends");
  };

  return (
    <>
      {status === "none" && (
        <button
          className="px-3 py-1 bg-blue-500 rounded"
          onClick={sendRequest}
        >
          Kết bạn
        </button>
      )}
      {status === "request_sent" && (
        <div className="text-gray-400">Đã gửi lời mời</div>
      )}
      {status === "request_received" && (
        <button
          className="px-3 py-1 bg-green-600 rounded"
          onClick={accept}
        >
          Chấp nhận
        </button>
      )}
      {status === "friends" && (
        <div className="text-green-400">Bạn bè</div>
      )}
    </>
  );
}
