// src/components/CommentBox.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function CommentBox({ videoId }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at")
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setComments(data || []);
  };

  useEffect(() => {
    loadComments();
    // optional: subscribe to real-time insert on comments
    const subscription = supabase
      .channel("public:comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` },
        (payload) => {
          setComments((c) => [...c, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [videoId]);

  const submit = async () => {
    if (!user) return alert("Bạn cần đăng nhập để bình luận");
    if (!text.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content: text.trim(),
    });
    setLoading(false);
    if (error) {
      alert("Lỗi: " + error.message);
      return;
    }
    setText("");
    // loadComments() will run via realtime subscription OR you can push manually
  };

  return (
    <div className="w-full max-w-md bg-black/50 backdrop-blur-sm rounded p-3">
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 p-2 rounded bg-gray-800 text-white"
          placeholder="Viết bình luận..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={submit} disabled={loading} className="px-3 py-2 bg-blue-600 rounded">
          {loading ? "..." : "Gửi"}
        </button>
      </div>

      <div className="max-h-48 overflow-auto space-y-2">
        {comments.length === 0 && <div className="text-sm text-gray-300">Chưa có bình luận</div>}
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="text-xs opacity-70">{c.user_id?.slice(0, 8)}</div>
            <div className="bg-gray-800/60 p-2 rounded">{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
