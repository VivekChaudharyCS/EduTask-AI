"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch cached roadmap (GET)
  async function fetchRoadmap() {
    try {
      setLoading(true);
      const res = await fetch("/api/roadmap", {
        method: "GET",
        headers: { ...authHeaders() },
      });

      if (res.ok) {
        const data = await res.json();
        setRoadmap(data.roadmap || []);
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ Regenerate roadmap (POST with tasks)
  async function regenerateRoadmap() {
    try {
      setLoading(true);

      const taskRes = await fetch("/api/tasks", {
        headers: { ...authHeaders() },
      });
      const tasks = taskRes.ok ? await taskRes.json() : [];
      const taskTitles = Array.isArray(tasks)
        ? tasks.map((t: any) => t.title).join(", ")
        : "";

      const prompt = taskTitles
        ? `Generate a learning roadmap based on these tasks: ${taskTitles}`
        : "Generate a general beginner-friendly learning roadmap";

      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoadmap(data.roadmap || []);
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ Load once on mount
  useEffect(() => {
    fetchRoadmap();
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Learning Roadmap</h1>
          <button
            onClick={regenerateRoadmap}
            disabled={loading}
            className="text-sm px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        <div className="space-y-4">
          {roadmap.length > 0 ? (
            roadmap.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 bg-white p-4 rounded-lg shadow-sm border"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </div>
                <p className="text-gray-700">{step}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">
              {loading ? "Loading roadmap..." : "No roadmap available."}
            </p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
