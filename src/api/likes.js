import { supabase } from "../supabaseClient";

export async function likeVideo(userId, videoId) {
  if (!userId) throw new Error("Not authenticated");
  // Insert like if not exists
  const { error } = await supabase
    .from("likes")
    .upsert({ user_id: userId, video_id: videoId }, { onConflict: ["user_id", "video_id"] });

  if (error) throw error;
  return true;
}

export async function unlikeVideo(userId, videoId) {
  const { error } = await supabase
    .from("likes")
    .delete()
    .match({ user_id: userId, video_id: videoId });

  if (error) throw error;
  return true;
}
