"use client";

import { useState, useEffect, useRef } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatBox() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  /** 🧠 Load history from DB on mount */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tutor/history", {
          headers: { ...authHeaders() },
        });
        if (res.ok) {
          const data = await res.json();
          // console.log(data);
          if (Array.isArray(data)) setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    })();
  }, []);

  /** 💾 Debounced DB sync whenever messages change */
  useEffect(() => {
    if (messages.length === 0) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSyncStatus("syncing");

    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/tutor/history", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ messages }),
        });
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch (err) {
        console.warn("Failed to sync chat:", err);
        setSyncStatus("idle");
      }
    }, 1500);
  }, [messages]);

  /** ✉️ Send message */
  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg: Msg = { role: "user", content: input };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          history: updatedMsgs.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const botMsg: Msg = {
        role: "assistant",
        content: data.answer ?? "No response",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const botMsg: Msg = {
        role: "assistant",
        content: err instanceof Error ? err.message : "Unknown error",
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  }

  /** 🧹 Clear chat completely */
  async function clearHistory() {
    if (!confirm("Clear chat history?")) return;

    setMessages([]);
    try {
      await fetch("/api/tutor/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ messages: [] }),
      });
      setSyncStatus("synced");
    } catch {
      console.warn("Failed to clear history");
      setSyncStatus("idle");
    }
  }

  /** Handle Enter key */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col h-[500px] bg-white shadow-sm relative">
      {/* 🔄 Sync indicator */}
      <div className="absolute top-2 right-3 text-xs">
        {syncStatus === "syncing" && (
          <span className="text-yellow-600 animate-pulse">Syncing...</span>
        )}
        {syncStatus === "synced" && (
          <span className="text-green-600">Synced ✓</span>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 mt-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4">
            👋 Start a conversation with your AI Tutor!
          </p>
        )}

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

        {loading && (
          <div className="text-xs text-gray-500">Tutor is typing...</div>
        )}
      </div>

      {/* Input Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border p-2 rounded text-sm"
          placeholder="Ask the tutor..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={clearHistory}
          className="bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 text-sm"
          title="Clear Chat History"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
