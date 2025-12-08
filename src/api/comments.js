// src/api/comments.js
import { supabase } from "../supabaseClient";

/**
 * fetchComments(itemId, type = "video" | "photo")
 */
export async function fetchComments(itemId, type = "video") {
  if (!itemId) return [];

  const field = type === "video" ? "video_id" : "photo_id";

  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, user_id, content, parent_id, created_at, video_id, photo_id")
    .eq(field, itemId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchComments error:", error);
    return [];
  }

  // fetch user profiles
  const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];

  let profilesMap = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    profilesMap = (profiles || []).reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }

  return comments.map((c) => ({
    ...c,
    user: profilesMap[c.user_id] || null,
  }));
}

/**
 * postComment({ user_id, content, video_id?, photo_id?, parent_id? })
 */
export async function postComment({ user_id, content, video_id = null, photo_id = null, parent_id = null }) {
  if (!user_id) throw new Error("user_id required");
  if (!content) throw new Error("content required");
  if (!video_id && !photo_id) throw new Error("video_id or photo_id required");

  const payload = {
    user_id,
    content,
    video_id,
    photo_id,
    parent_id,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("comments").insert([payload]).select().single();

  if (error) {
    console.error("postComment error:", error);
    throw error;
  }

  // fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", user_id)
    .maybeSingle();

  return {
    ...data,
    user: profile || null,
  };
}

/**
 * deleteComment(commentId)
 */
export async function deleteComment(commentId) {
  if (!commentId) throw new Error("commentId required");

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    console.error("deleteComment error:", error);
    throw error;
  }
  return true;
}
