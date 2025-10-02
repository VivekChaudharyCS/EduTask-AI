"use client";

import { useEffect, useState } from "react";
import { authHeaders, clearAuth, getToken } from "../../lib/utils/clientAuth";
import ProgressBar from "../../components/ui/ProgressBar";
import { useRouter } from "next/navigation";

type Progress = {
  completedTasks: number;
  totalTasks: number;
  completedSubtasks: number;
  totalSubtasks: number;
  percentage: number;
};

type UserInfo = {
  name: string;
  email: string;
};

export default function ProfilePage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  async function loadProgress() {
    try {
      const res = await fetch("/api/progress", { headers: { ...authHeaders() } });
      if (!res.ok) return;
      setProgress(await res.json());
    } catch {}
  }

  async function loadUser() {
    try {
      const res = await fetch("/api/me", { headers: { ...authHeaders() } });
      if (!res.ok) return;
      setUser(await res.json());
    } catch {}
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // 🚨 no token → redirect to login
      router.replace("/login");
      return;
    }

    Promise.all([loadUser(), loadProgress()]).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button
          className="text-sm underline"
          onClick={() => {
            clearAuth();
            router.replace("/login"); // ✅ use router instead of full reload
          }}
        >
          Logout
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="bg-white border rounded-lg shadow-sm p-6 space-y-2">
          <h2 className="text-lg font-medium text-gray-800">{user.name}</h2>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      )}

      {/* Progress Summary */}
      {progress && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="font-medium mb-2">Your Learning Progress</h2>
          <p>
            ✅ Completed tasks: {progress.completedTasks}/{progress.totalTasks}
          </p>
          <p>
            📌 Completed subtasks: {progress.completedSubtasks}/{progress.totalSubtasks}
          </p>
          <div className="mt-3">
            <ProgressBar value={progress.percentage} />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Overall Progress: {progress.percentage}%
          </p>
        </div>
      )}
    </div>
  );
}
