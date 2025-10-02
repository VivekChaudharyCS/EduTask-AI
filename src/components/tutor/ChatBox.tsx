// src/components/tutor/ChatBox.tsx
"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    // Add user message locally
    const userMsg: Msg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          history: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tutor error");

      const botMsg: Msg = {
        role: "assistant",
        content: data.answer ?? "No response",
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: unknown) {
      const botMsg: Msg = {
        role: "assistant",
        content: err instanceof Error ? err.message : "Unknown error",
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-md text-sm whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-blue-100 text-blue-900 self-end"
                : "bg-gray-100 text-gray-800 self-start"
            }`}
          >
            <strong>{m.role === "user" ? "You" : "Tutor"}:</strong> {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Tutor is typing...</div>}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border p-2 rounded"
          placeholder="Ask the tutor..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
