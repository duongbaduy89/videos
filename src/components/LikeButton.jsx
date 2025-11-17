// src/components/LikeButton.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function LikeButton({ videoId }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // load initial like state & count
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [{ data: likes }, { error: userLikeRes }] = await Promise.all([
        supabase.from("likes").select("*").eq("video_id", videoId),
        user
          ? supabase
              .from("likes")
              .select("*")
              .eq("video_id", videoId)
              .eq("user_id", user.id)
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);
      if (!mounted) return;
      if (likes) setCount(likes.length);
      if (user && userLikeRes?.data) setLiked(userLikeRes.data.length > 0);
    };
    load();
    return () => { mounted = false; };
  }, [videoId, user]);

  const toggle = async () => {
    if (!user) {
      alert("Bạn cần đăng nhập để like");
      return;
    }
    setLoading(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);
        if (!error) {
          setLiked(false);
          setCount((c) => Math.max(0, c - 1));
        }
      } else {
        const { error } = await supabase.from("likes").insert({
          user_id: user.id,
          video_id: videoId,
        });
        if (!error) {
          setLiked(true);
          setCount((c) => c + 1);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      <button
        onClick={toggle}
        disabled={loading}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm text-xl"
        aria-label="Like"
        title={liked ? "Unlike" : "Like"}
      >
        {liked ? "💖" : "🤍"}
      </button>
      <div className="mt-1 text-xs opacity-90">{count}</div>
    </div>
  );
}
