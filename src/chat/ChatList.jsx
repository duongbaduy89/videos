import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function ChatList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("conversations")
      .select(`
        id,
        user1,
        user2,
        messages(content, image_url, created_at),
        profiles:user2(id, username, avatar_url)
      `)
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .then(({ data }) => setConversations(data));
  }, [user]);

  return (
    <div className="p-4 text-white">
      <h2 className="text-xl font-bold mb-4">Tin nhắn</h2>

      {conversations.map((c) => (
        <Link
          key={c.id}
          to={`/chat/${c.id}`}
          className="block p-3 border-b border-gray-700"
        >
          <div className="flex items-center gap-2">
            <img
              src={c.profiles?.avatar_url}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="font-semibold">{c.profiles?.username}</div>
              <div className="text-gray-400 text-sm">
                {c.messages?.[0]?.content
                  ? c.messages[0].content
                  : c.messages?.[0]?.image_url
                  ? "[Ảnh]"
                  : "..."}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
