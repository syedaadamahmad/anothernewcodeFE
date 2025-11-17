"use client";

import ReactMarkdown from "react-markdown";
import OfferWidgets from "./OfferWidgets";

export default function ChatMessage({ msg, platform, onUserSelect }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow
        ${isUser ? "bg-indigo-600 text-white" : "bg-white text-gray-800 border"}
      `}
      >
        <ReactMarkdown>{msg.content}</ReactMarkdown>

        {/* Widgets appear only for AI messages */}
        {!isUser && (
          <OfferWidgets
            msg={msg}
            platform={platform}
            onUserSelect={onUserSelect}   // ⭐ pass down
          />
        )}
      </div>
    </div>
  );
}
