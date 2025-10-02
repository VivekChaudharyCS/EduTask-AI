"use client";

import { useEffect, useState } from "react";
import { authHeaders, clearAuth } from "../../lib/utils/clientAuth";
import ProgressBar from "../../components/ui/ProgressBar";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

type Progress = {
  completedTasks: number;
  totalTasks: number;
  completedSubtasks: number;
  totalSubtasks: number;
  percentage: number;
};
type Resource = { title: string; url: string; type?: string };

export default function DashboardPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  // resources (sidebar)
  const [resources, setResources] = useState<Resource[]>([]);
  const [playerUrl, setPlayerUrl] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  // tutor UI
  const [tutorOpen, setTutorOpen] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [input, setInput] = useState("");

  async function loadProgress() {
    try {
      const res = await fetch("/api/progress", {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      setProgress(await res.json());
    } catch {}
  }

  async function fetchRoadmap() {
    try {
      setLoadingRoadmap(true);
      const res = await fetch("/api/roadmap", {
        method: "GET",
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRoadmap(data.roadmap || []);
    } finally {
      setLoadingRoadmap(false);
    }
  }

  async function regenerateRoadmap() {
    try {
      setLoadingRoadmap(true);
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prompt: "Regenerate my learning roadmap" }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setRoadmap(data.roadmap || []);
    } finally {
      setLoadingRoadmap(false);
    }
  }

  useEffect(() => {
    loadProgress();
    fetchRoadmap();
  }, []);

  async function callRecommend(query: string) {
    setNotice(null);
    setResources([]);
    setPlayerUrl("");
    if (!query || !query.trim()) {
      setNotice("Enter a search term or click a task's Get Recommendations.");
      return;
    }
    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recommendation failed");

      const mapped = Array.isArray(data)
        ? data
        : data.resources || data.items || [];
      const resourcesArr = (mapped as any[]).map((r) => ({
        title: r.title,
        url: r.url,
        type:
          r.type ||
          (typeof r.url === "string" && r.url.includes("youtube")
            ? "youtube"
            : "link"),
      }));
      setResources(resourcesArr);
      const liveCount = resourcesArr.filter(
        (r) => typeof r.url === "string" && r.url.includes("youtube.com/watch")
      ).length;
      setNotice(
        liveCount > 0
          ? `Fetched ${resourcesArr.length} resources (${liveCount} YouTube).`
          : `Fetched ${resourcesArr.length} resources.`
      );
    } catch (e) {
      console.error("Recommendation failed:", e);
      setNotice("Failed to fetch recommendations.");
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const msg = { role: "user" as const, text: input.trim() };
    setMessages((prev) => [...prev, msg]);
    setInput("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          history: [...messages, msg].map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.answer || "Sorry, no reply." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Something went wrong." },
      ]);
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        {/* Left / Main: 2 col space on lg */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/tasks"
                className="text-sm text-indigo-600 hover:underline"
              >
                Manage Tasks
              </Link>
            </div>
          </div>

          {/* Progress Summary */}
          {progress && (
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h2 className="font-medium mb-2">Progress Summary</h2>
              <p>
                ✅ Completed tasks: {progress.completedTasks}/
                {progress.totalTasks}
              </p>
              <p>
                📌 Completed subtasks: {progress.completedSubtasks}/
                {progress.totalSubtasks}
              </p>
              <div className="mt-3">
                <ProgressBar value={progress.percentage} />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Overall Progress: {progress.percentage}%
              </p>
            </div>
          )}

          {/* Roadmap preview */}
          <div className="bg-white border rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-medium">Next Steps</h2>
              <button
                disabled={loadingRoadmap}
                onClick={regenerateRoadmap}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                {loadingRoadmap ? "Refreshing..." : "Regenerate"}
              </button>
            </div>
            {roadmap.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                {roadmap.slice(0, 3).map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No roadmap yet. Generate one to get started!
              </p>
            )}
            <Link
              href="/roadmap"
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              View Full Roadmap →
            </Link>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Recommended Resources</h3>
              <button
                className="text-xs text-indigo-600"
                onClick={() => callRecommend("general programming resources")}
              >
                Refresh
              </button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                placeholder="Search resources..."
                className="flex-1 border rounded px-3 py-1 text-sm"
                id="dashboard-resource-search"
              />
              <button
                className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                onClick={() => {
                  const el = document.getElementById(
                    "dashboard-resource-search"
                  ) as HTMLInputElement | null;
                  callRecommend(el?.value ?? "");
                }}
              >
                Search
              </button>
            </div>

            {notice && (
              <div className="text-xs text-gray-600 mb-2">{notice}</div>
            )}

            {resources.length > 0 ? (
              resources.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-sm">{r.title}</div>
                    <div className="text-xs text-gray-500">{r.type}</div>
                  </div>
                  {r.type === "youtube" &&
                  typeof r.url === "string" &&
                  r.url.includes("youtube.com/watch") ? (
                    <button
                      onClick={() => setPlayerUrl(r.url)}
                      className="text-indigo-600 text-sm"
                    >
                      Play
                    </button>
                  ) : (
                    <a
                      className="text-indigo-600 text-sm"
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No resources yet.</p>
            )}

            {playerUrl && (
              <div className="mt-3">
                <iframe
                  width="100%"
                  height="200"
                  src={`https://www.youtube.com/embed/${
                    playerUrl.split("v=")[1]?.split("&")[0]
                  }`}
                  title="YouTube player"
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
                <button
                  onClick={() => setPlayerUrl("")}
                  className="mt-2 text-xs px-2 py-1 bg-gray-100 rounded"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* small placeholder card for AI Tutor preview */}
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <h4 className="font-medium">AI Tutor</h4>
            <p className="text-sm text-gray-500 mt-2">
              Open the assistant using the floating icon below.
            </p>
          </div>
        </aside>

        {/* Floating AI Tutor / Chatbox */}
        {!tutorOpen && (
          <button
            onClick={() => setTutorOpen(true)}
            className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        {tutorOpen && (
          <div className="fixed bottom-6 right-6 w-80 h-96 bg-white border rounded-lg shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <h2 className="font-medium text-indigo-600">AI Tutor</h2>
              <button onClick={() => setTutorOpen(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
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
            </div>

            <div className="p-3 border-t flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none"
                placeholder="Ask anything about your learning journey..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
