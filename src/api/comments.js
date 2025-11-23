// src/api/comments.js
import { supabase } from "../supabaseClient";

/**
 * fetchComments(videoId)
 * returns flat array of comments ordered by created_at asc,
 * each comment has: id, user_id, video_id, content, parent_id, created_at
 * and a `user` object { username, avatar_url }
 */
export async function fetchComments(videoId) {
  if (!videoId) return [];

  // 1) fetch comments for video
  const { data: comments, error } = await supabase
    .from("comments")
    .select("id, user_id, video_id, content, parent_id, created_at")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchComments error:", error);
    return [];
  }

  // collect unique user_ids
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

  // attach user
  const enriched = (comments || []).map((c) => ({
    ...c,
    user: profilesMap[c.user_id] || null,
  }));

  return enriched;
}

/**
 * postComment({ user_id, video_id, content, parent_id })
 * returns inserted comment (with created_at) and user info
 */
export async function postComment({ user_id, video_id, content, parent_id = null }) {
  if (!user_id) throw new Error("user_id required");
  if (!video_id) throw new Error("video_id required");
  if (!content) throw new Error("content required");

  const payload = {
    user_id,
    video_id,
    content,
    parent_id,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("comments").insert([payload]).select().single();

  if (error) {
    console.error("postComment error:", error);
    throw error;
  }

  // fetch user profile for this comment
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
  // optionally: remove children recursively or keep them (choose to cascade or mark deleted). Here we delete single.
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) {
    console.error("deleteComment error:", error);
    throw error;
  }
  return true;
}
