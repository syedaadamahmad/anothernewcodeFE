// components/NestedChat.jsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import useSmartAutoScroll from "@/hooks/useSmartAutoScroll";

export default function NestedChat({ platform, price, chats, setChats, baseUrl }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const BASE = baseUrl || process.env.NEXT_PUBLIC_BACKEND_URLS || "http://127.0.0.1:8000";
  const platformKey = platform || "Unknown";
  const thread = chats?.[platformKey] || [];

  const { endRef, containerRef } = useSmartAutoScroll(chats, platformKey);

  const appendMessage = (role, content) => {
    setChats(prev => {
      const prevThread = prev[platformKey] || [];
      const updated = [...prevThread, { role, content }];
      return { ...prev, [platformKey]: updated };
    });
  };

  const sendMessage = async (manual = null) => {
    const text = (manual ?? input).trim();
    if (!text) return;

    appendMessage("user", text);
    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(`${BASE}/chat/flight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_history: [...thread, { role: "user", content: text }],
          flight_context: { platform: platformKey, base_price: price || 0 },
        }),
      });

      const data = await resp.json();
      appendMessage("ai", data?.content ?? "No reply");
    } catch (err) {
      appendMessage("ai", `⚠️ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /** When user selects dropdown option **/
  const handleWidgetSelect = (value) => {
    appendMessage("user", value);
    sendMessage(value);
  };

  return (
    <div className="w-full px-3 py-4 bg-white border rounded-2xl shadow">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{platformKey} — Deals Assistant</h2>
        <p className="text-xs text-gray-500">Price: ₹{(price || 0).toLocaleString()}</p>
      </div>

      {/* Message List */}
      <div
        ref={containerRef}
        className="overflow-y-auto max-h-[60vh] space-y-3 pb-2 pr-1"
      >
        {thread.map((msg, index) => (
          <ChatMessage
            key={index}
            msg={msg}
            platform={platformKey}
            onUserSelect={handleWidgetSelect}
          />
        ))}

        {isLoading && (
          <div className="text-gray-500 text-sm">Typing...</div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input Box */}
      <div className="mt-3 flex items-center gap-2">
        <input
          className="flex-1 border px-4 py-2 rounded-full text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
