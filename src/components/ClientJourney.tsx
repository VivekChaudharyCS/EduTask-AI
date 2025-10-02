"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "../lib/utils/clientAuth";

type Progress = {
  completedTasks: number;
  totalTasks: number;
  quizzesTaken: number;
  avgScore: number;
  percentage: number;
};

export default function ClientJourney() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ Load progress + roadmap
  async function loadData() {
    try {
      setLoading(true);

      // Progress
      const progRes = await fetch("/api/progress", { headers: { ...authHeaders() } });
      if (progRes.ok) setProgress(await progRes.json());

      // Roadmap (cached)
      const roadRes = await fetch("/api/roadmap", { headers: { ...authHeaders() } });
      if (roadRes.ok) {
        const data = await roadRes.json();
        setRoadmap(data.roadmap || []);
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ Regenerate roadmap
  async function regenerateRoadmap() {
    try {
      setLoading(true);
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prompt: "Regenerate my learning roadmap" }),
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data.roadmap || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Your Learning Journey</h1>

      {/* Roadmap */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Learning Roadmap</h2>
          <button
            disabled={loading}
            onClick={regenerateRoadmap}
            className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Regenerate"}
          </button>
        </div>
        {roadmap.length > 0 ? (
          <ul className="space-y-3">
            {roadmap.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
                  {idx + 1}
                </div>
                <p className="text-gray-700">{step}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            {loading ? "Loading roadmap..." : "No roadmap available yet."}
          </p>
        )}
      </div>

      {/* Progress Overview */}
      {progress && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="font-medium mb-3">Progress Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
            <div>
              ✅ <span className="font-semibold">{progress.completedTasks}</span> /{" "}
              {progress.totalTasks} Tasks
            </div>
            <div>
              📝 <span className="font-semibold">{progress.quizzesTaken}</span> Quizzes
            </div>
            <div>
              📊 Avg Score:{" "}
              <span className="font-semibold">{progress.avgScore}%</span>
            </div>
            <div>
              🔄 Overall:{" "}
              <span className="font-semibold">{progress.percentage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      {roadmap.length > 0 && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="font-medium mb-2">Next Steps</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            {roadmap.slice(0, 3).map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
