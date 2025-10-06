"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { authHeaders } from "../../lib/utils/clientAuth";

type Message = { role: "user" | "ai"; text: string };

export default function FloatingTutor() {
  const [tutorOpen, setTutorOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const fetchedOnce = useRef(false);

  /** 🟢 Fetch history from DB manually when chat is opened */
  async function fetchHistory() {
    try {
      setSyncStatus("syncing");
      const res = await fetch("/api/tutor/history", {
        headers: { ...authHeaders() },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map((m) => ({
            role: m.role === "assistant" ? "ai" : "user",
            text: m.content,
          }));
          setMessages(formatted);
        }
      }

      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setSyncStatus("idle");
    }
  }

  /** 🧩 Add global event listener for tutor open action */
  useEffect(() => {
    function handleTutorOpen() {
      // Fetch only when opening
      fetchHistory();
    }

    // Listen for custom event
    window.addEventListener("open-floating-tutor", handleTutorOpen);

    return () => {
      window.removeEventListener("open-floating-tutor", handleTutorOpen);
    };
  }, []);

  /** 💾 Debounced sync whenever messages change */
  useEffect(() => {
    if (!tutorOpen || messages.length === 0) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSyncStatus("syncing");

    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/tutor/history", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.text,
            })),
          }),
        });
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      } catch (err) {
        console.warn("Failed to sync chat:", err);
        setSyncStatus("idle");
      }
    }, 1500);
  }, [messages, tutorOpen]);

  /** ✉️ Send message */
  async function sendMessage() {
    if (!input.trim()) return;

    const msg = { role: "user" as const, text: input.trim() };
    const updatedMsgs = [...messages, msg];
    setMessages(updatedMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          history: updatedMsgs.map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      const aiReply = data.answer ?? "🤖 No response";
      setMessages((prev) => [...prev, { role: "ai", text: aiReply }]);
    } catch (err) {
      console.error("Tutor error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /** 🧹 Clear chat completely */
  async function clearChat() {
    if (!confirm("Clear chat history?")) return;
    setMessages([]);
    try {
      await fetch("/api/tutor/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ messages: [] }),
      });
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch {
      console.warn("Failed to clear history");
      setSyncStatus("idle");
    }
  }

  /** 📢 Notify event listener when tutor is opened */
  function handleTutorOpen() {
    setTutorOpen(true);
    // trigger event for external listener (it will fetch history)
    window.dispatchEvent(new Event("open-floating-tutor"));
  }

  return (
    <>
      {!tutorOpen && (
        <button
          onClick={handleTutorOpen}
          className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition"
          title="Open AI Tutor"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {tutorOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-96 bg-white border rounded-lg shadow-lg flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <h2 className="font-medium text-indigo-600 flex items-center gap-2">
              AI Tutor
              {syncStatus === "syncing" && (
                <span className="text-xs text-yellow-600 animate-pulse">
                  (syncing...)
                </span>
              )}
              {syncStatus === "synced" && (
                <span className="text-xs text-green-600">(synced ✓)</span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-red-500"
              >
                Clear
              </button>
              <button onClick={() => setTutorOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
            {messages.length === 0 && (
              <p className="text-gray-400 text-center mt-20 text-sm">
                👋 Hi there! Ask me anything to get started.
              </p>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md max-w-[75%] ${
                  m.role === "user"
                    ? "ml-auto bg-indigo-100 text-indigo-800"
                    : "mr-auto bg-gray-100 text-gray-800"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-gray-500">Tutor is typing...</div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm"
              disabled={loading}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
