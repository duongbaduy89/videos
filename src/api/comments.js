import { supabase } from "../supabaseClient";

export async function postComment(userId, videoId, content) {
  if (!userId) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: userId, video_id: videoId, content })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchComments(videoId) {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      user:profiles ( id, username, avatar_url )
    `)
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}
