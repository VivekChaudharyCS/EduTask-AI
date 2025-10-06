"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";
import ProgressBar from "../../components/ui/ProgressBar";
import Link from "next/link";
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

  /** ✅ Load progress */
  async function loadProgress() {
    try {
      const res = await fetch("/api/progress", {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      setProgress(await res.json());
    } catch {}
  }

  /** ✅ Load roadmap */
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

  /** ✅ Regenerate roadmap */
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

  /** ✅ Unified recommendation loader (from API or localStorage) */
  async function callRecommend(query?: string) {
    setNotice("Fetching recommendations...");
    setResources([]);
    setPlayerUrl("");

    try {
      // Load contextual query if not provided
      const taskRes = await fetch("/api/tasks", {
        headers: { ...authHeaders() },
      });
      const taskData = await taskRes.json();
      const userTasks = Array.isArray(taskData) ? taskData : [];
      const topTask = userTasks.find((t: any) => !t.completed) || userTasks[0];
      const contextQuery =
        query?.trim() || topTask?.title || "general programming";

      // Fetch from API
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query: contextQuery }),
      });
      const data = await res.json();

      const mapped = Array.isArray(data)
        ? data
        : data.resources || data.items || [];

      const resourcesArr = (mapped as any[]).map((r) => ({
        title: r.title || contextQuery,
        url: r.url || "#",
        type:
          r.type ||
          (typeof r.url === "string" && r.url.includes("youtube")
            ? "youtube"
            : "link"),
      }));

      setResources(resourcesArr);

      // ✅ Save to localStorage for persistence
      localStorage.setItem("recommendedResources", JSON.stringify(resourcesArr));

      const youtubeCount = resourcesArr.filter((r) =>
        r.url.includes("youtube.com/watch")
      ).length;

      setNotice(
        `Fetched ${resourcesArr.length} resources for "${contextQuery}" (${
          youtubeCount > 0 ? youtubeCount + " YouTube" : "no YouTube"
        }).`
      );
    } catch (e) {
      console.error("Recommendation failed:", e);
      setNotice("Failed to fetch recommendations.");
    }
  }

  /** ✅ Load progress, roadmap, and localStorage recommendations */
  useEffect(() => {
    loadProgress();
    fetchRoadmap();

    // Try to load saved recommendations
    const saved = localStorage.getItem("recommendedResources");
    if (saved) {
      const parsed = JSON.parse(saved);
      setResources(parsed);
      setNotice(`Loaded ${parsed.length} saved recommendations.`);
    } else {
      // fallback: auto-fetch default recommendations
      callRecommend("general programming resources");
    }

    // ✅ Auto-sync between tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "recommendedResources" && e.newValue) {
        const parsed = JSON.parse(e.newValue);
        setResources(parsed);
        setNotice(`Synced ${parsed.length} recommendations from another page.`);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        {/* Left / Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <Link
              href="/tasks"
              className="text-sm text-indigo-600 hover:underline"
            >
              Manage Tasks
            </Link>
          </div>

          {/* ✅ Progress */}
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

          {/* ✅ Roadmap */}
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

        {/* ✅ Right Sidebar: Recommended Resources */}
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
              <ul className="space-y-2 text-sm">
                {resources.map((r, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {r.title}
                    </a>
                    {r.type === "youtube" &&
                      r.url.includes("youtube.com/watch") && (
                        <button
                          onClick={() => setPlayerUrl(r.url)}
                          className="ml-3 text-xs px-2 py-1 bg-indigo-100 rounded text-indigo-700 hover:bg-indigo-200"
                        >
                          ▶ Play
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No resources yet.</p>
            )}

            {/* ✅ YouTube Player */}
            {playerUrl && (
              <div className="mt-4">
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
                  className="mt-2 text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Close Player
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </ProtectedRoute>
  );
}
