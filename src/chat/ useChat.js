import { supabase } from "../supabaseClient";

export async function getOrCreateConversation(userId, friendId) {
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .or(`user1.eq.${userId},user2.eq.${userId}`)
    .or(`user1.eq.${friendId},user2.eq.${friendId}`);

  if (data && data.length > 0) return data[0];

  const { data: created } = await supabase
    .from("conversations")
    .insert([
      { user1: userId, user2: friendId }
    ])
    .select()
    .single();

  return created;
}

export async function sendTextMessage(convId, senderId, content) {
  await supabase.from("messages").insert([
    { conversation_id: convId, sender_id: senderId, content }
  ]);
}

export async function sendImageMessage(convId, senderId, imageUrl) {
  await supabase.from("messages").insert([
    { conversation_id: convId, sender_id: senderId, image_url: imageUrl }
  ]);
}

export function subscribeMessages(convId, callback) {
  return supabase
    .channel(`conv_${convId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
}
