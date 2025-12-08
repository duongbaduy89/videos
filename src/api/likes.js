// src/api/like.js
import { supabase } from "../supabaseClient";

// LIKE for both video and photo
export async function likeItem({ userId, videoId = null, photoId = null }) {
  if (!userId) throw new Error("Not authenticated");
  if (!videoId && !photoId) throw new Error("videoId or photoId required");

  const payload = {
    user_id: userId,
    video_id: videoId,
    photo_id: photoId,
  };

  const { error } = await supabase
    .from("likes")
    .upsert(payload, { onConflict: ["user_id", "video_id", "photo_id"] });

  if (error) throw error;
  return true;
}

export async function unlikeItem({ userId, videoId = null, photoId = null }) {
  if (!userId) throw new Error("Not authenticated");
  if (!videoId && !photoId) throw new Error("videoId or photoId required");

  const { error } = await supabase
    .from("likes")
    .delete()
    .match({
      user_id: userId,
      video_id: videoId,
      photo_id: photoId,
    });

  if (error) throw error;
  return true;
}
