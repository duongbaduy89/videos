import React, { useState } from "react";

export default function ChatInput({ onSendText, onSendImage }) {
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim()) return;
    onSendText(text);
    setText("");
  };

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("https://chatfr.<your-worker-id>.workers.dev/upload-image", {
      method: "POST",
      body: form
    });

    const data = await res.json();
    onSendImage(data.url);
  };

  return (
    <div className="p-2 border-t border-gray-700 flex items-center gap-2">
      <label className="text-xl cursor-pointer">
        📷
        <input type="file" accept="image/*" className="hidden" onChange={uploadImage} />
      </label>

      <input
        className="flex-1 bg-gray-900 p-2 rounded-xl outline-none"
        placeholder="Nhập tin nhắn..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button className="px-3 py-1 bg-blue-600 rounded" onClick={send}>
        Gửi
      </button>
    </div>
  );
}
