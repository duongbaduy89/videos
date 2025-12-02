import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { sendTextMessage, sendImageMessage, subscribeMessages } from "./useChat";
import ChatInput from "./ChatInput";

export default function ChatRoom({ conversationId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef();

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data));

    const sub = subscribeMessages(conversationId, (msg) =>
      setMessages((prev) => [...prev, msg])
    );

    return () => supabase.removeChannel(sub);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isMine = (id) => id === user.id;

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`my-2 flex ${isMine(m.sender_id) ? "justify-end" : "justify-start"}`}
          >
            <div className={`p-2 max-w-[70%] rounded-xl ${isMine(m.sender_id) ? "bg-blue-600" : "bg-gray-800"}`}>
              {m.content && <div>{m.content}</div>}
              {m.image_url && (
                <img src={m.image_url} className="rounded-lg mt-1 max-h-64" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      <ChatInput
        onSendText={(text) => sendTextMessage(conversationId, user.id, text)}
        onSendImage={(url) => sendImageMessage(conversationId, user.id, url)}
      />
    </div>
  );
}
