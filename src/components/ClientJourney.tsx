"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "../lib/utils/clientAuth";
import { useRouter, useSearchParams } from "next/navigation";

type Progress = {
  completedTasks: number;
  totalTasks: number;
  completedSubtasks: number;
  totalSubtasks: number;
  quizzesTaken: number;
  avgScore: number;
  percentage: number;
};

type QuizHistory = {
  _id: string; // attemptId
  quizId: string; // parent quiz
  date: string;
  score: number;
  taskId: string;
  taskTitle: string;
  answers: {
    question: string;
    submitted: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
};

export default function ClientJourney() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);

  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});

  const searchParams = useSearchParams();
  const latestAttemptId = searchParams.get("attemptId");
  const router = useRouter();

  /** 🧩 Load all user data (progress, roadmap, quiz history) */
  async function loadData() {
    try {
      setLoading(true);

      const [progRes, roadRes] = await Promise.all([
        fetch("/api/progress", { headers: { ...authHeaders() } }),
        fetch("/api/roadmap", { headers: { ...authHeaders() } }),
      ]);

      if (progRes.ok) setProgress(await progRes.json());
      if (roadRes.ok) {
        const data = await roadRes.json();
        setRoadmap(data.roadmap || []);
      }

      await fetchQuizHistory(1);
    } catch (err) {
      console.error("❌ Data load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  /** 🧩 Fetch paginated quiz history */
  async function fetchQuizHistory(pageNum: number) {
    try {
      const res = await fetch(`/api/quiz/history?page=${pageNum}&limit=5`, {
        headers: { ...authHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setQuizHistory(data.attempts || []);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } else {
        setQuizHistory([]);
      }
    } catch (err) {
      console.error("❌ Quiz history fetch failed:", err);
      setQuizHistory([]);
    }
  }

  /** 🔁 Regenerate roadmap */
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

  /** 🎯 Retake specific quiz — ensures correct quizId is fetched */
  async function retryQuiz(taskId: string, quizId?: string) {
    try {
      setRetryLoading(quizId || taskId);

      // Step 1: Try to fetch existing quiz directly
      if (quizId) {
        console.log(`🎯 Attempting to load quiz ${quizId}`);
        const res = await fetch(`/api/quiz/${quizId}`, {
          headers: { ...authHeaders() },
        });

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Loaded quiz ${data._id}`);
          router.push(`/tasks?taskId=${data.taskId}&quizId=${data._id}`);
          return;
        } else {
          console.warn(`⚠️ Quiz ${quizId} not found (status ${res.status})`);
        }
      }

      // Step 2: Attempt to reuse recent quiz for same task
      const retryRes = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "retry", taskId }),
      });
      const retryData = await retryRes.json();

      if (retryRes.ok && retryData?._id && retryData._id !== "fallback") {
        console.log(`✅ Using reused quiz ${retryData._id}`);
        router.push(
          `/tasks?taskId=${retryData.taskId}&quizId=${retryData._id}`
        );
        return;
      }

      // Step 3: Generate a new quiz if needed
      console.warn("⚠️ Generating a new quiz...");
      const genRes = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "generate", taskId }),
      });
      const newQuiz = await genRes.json();

      router.push(`/tasks?taskId=${taskId}&quizId=${newQuiz._id}`);
    } catch (err) {
      console.error("❌ Retry quiz failed:", err);
      alert("Failed to retry quiz. Please try again later.");
    } finally {
      setRetryLoading(null);
    }
  }

  /** Load on mount */
  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Your Learning Journey</h1>

      {/* 🧭 Learning Roadmap */}
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
          <>
            <ul className="space-y-3">
              {(expanded ? roadmap : roadmap.slice(0, 6)).map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <p className="text-gray-700 break-words">{step}</p>
                </li>
              ))}
            </ul>
            {roadmap.length > 6 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs text-indigo-600 hover:underline"
              >
                {expanded ? "Show Less" : "Show More"}
              </button>
            )}
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            {loading ? "Loading roadmap..." : "No roadmap available yet."}
          </p>
        )}
      </div>

      {/* 📊 Progress Overview */}
      {progress && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="font-medium mb-3">Progress Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-gray-700">
            <div>
              ✅ <strong>{progress.completedTasks}</strong> /{" "}
              {progress.totalTasks} Tasks
            </div>
            <div>
              📋 <strong>{progress.completedSubtasks}</strong> /{" "}
              {progress.totalSubtasks} Subtasks
            </div>
            <div>
              📝 <strong>{progress.quizzesTaken}</strong> Quizzes
            </div>
            <div>
              📊 Avg Score: <strong>{progress.avgScore}%</strong>
            </div>
            <div>
              🔄 Overall Progress: <strong>{progress.percentage}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 🧩 Quiz History */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="font-medium mb-3">Quiz History</h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading quiz history...</p>
        ) : quizHistory.length > 0 ? (
          <div className="space-y-4">
            {quizHistory.map((attempt) => {
              const expandedAns = expandedAnswers[attempt._id] || false;
              const highlight = latestAttemptId === attempt._id;
              const isLoading =
                retryLoading === attempt._id || retryLoading === attempt.taskId;

              return (
                <div
                  key={attempt._id}
                  className={`p-4 border rounded-lg shadow-sm ${
                    highlight
                      ? "border-indigo-500 ring-2 ring-indigo-300"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {attempt.taskTitle || "Untitled Task"}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(attempt.date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-2">
                    Score: {attempt.score}/{attempt.answers.length}
                  </p>

                  <ul className="space-y-2">
                    {(expandedAns
                      ? attempt.answers
                      : attempt.answers.slice(0, 3)
                    ).map((ans, idx) => (
                      <li
                        key={idx}
                        className={`p-2 rounded text-sm ${
                          ans.isCorrect
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <p>{ans.question}</p>
                        <p>
                          Your answer: <strong>{ans.submitted}</strong>
                        </p>
                        {!ans.isCorrect && (
                          <p>
                            Correct answer: <strong>{ans.correctAnswer}</strong>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  {attempt.answers.length > 3 && (
                    <button
                      onClick={() =>
                        setExpandedAnswers((prev) => ({
                          ...prev,
                          [attempt._id]: !expandedAns,
                        }))
                      }
                      className="mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      {expandedAns ? "Show Less" : "Show More"}
                    </button>
                  )}

                  <button
                    onClick={() => retryQuiz(attempt.taskId, attempt.quizId)}
                    disabled={isLoading}
                    className={`mt-3 px-3 py-1 text-sm rounded text-white ${
                      isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {isLoading ? "Resuming..." : "Retake Quiz"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center border rounded-lg bg-gray-50 text-gray-500">
            <p className="text-sm">📝 You haven’t taken any quizzes yet.</p>
            <p className="text-xs mt-1">
              Start by completing a task and taking your first quiz!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
