"use client";
import { useEffect, useState } from "react";
import { authHeaders } from "../lib/utils/clientAuth";
import { useRouter, useSearchParams } from "next/navigation";

type Progress = {
  completedTasks: number;
  totalTasks: number;
  quizzesTaken: number;
  avgScore: number;
  percentage: number;
};

type QuizHistory = {
  _id: string;
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

  // quiz history
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // expanded answers
  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});

  // highlight latest attempt
  const searchParams = useSearchParams();
  const latestAttemptId = searchParams.get("attemptId");

  const router = useRouter();

  async function loadData() {
    try {
      setLoading(true);

      // Progress
      const progRes = await fetch("/api/progress", {
        headers: { ...authHeaders() },
      });
      if (progRes.ok) setProgress(await progRes.json());

      // Roadmap
      const roadRes = await fetch("/api/roadmap", {
        headers: { ...authHeaders() },
      });
      if (roadRes.ok) {
        const data = await roadRes.json();
        setRoadmap(data.roadmap || []);
      }

      // Quiz history
      await fetchQuizHistory(1);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuizHistory(pageNum: number) {
    const res = await fetch(`/api/quiz/history?page=${pageNum}&limit=5`, {
      headers: { ...authHeaders() },
    });
    if (res.ok) {
      const data = await res.json();
      setQuizHistory(data.attempts || []);
      setPage(data.page);
      setTotalPages(data.totalPages);
    }
  }

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

  async function retryQuiz(taskId: string, quizId?: string) {
    if (!taskId) return alert("Task ID missing");

    try {
      if (quizId) {
        // ✅ just reload the existing quiz (don’t generate new)
        router.push(`/tasks?taskId=${taskId}&quizId=${quizId}`);
        return;
      }

      // fallback: generate new if no quizId found
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "retry", taskId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Retry failed");
      }

      const data = await res.json();
      router.push(`/tasks?taskId=${taskId}&quizId=${data._id}`);
    } catch (err) {
      console.error("Retry failed:", err);
      alert("Failed to retry quiz. Task might be missing.");
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

      {/* Progress Overview */}
      {progress && (
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="font-medium mb-3">Progress Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
            <div>
              ✅{" "}
              <span className="font-semibold">{progress.completedTasks}</span> /{" "}
              {progress.totalTasks} Tasks
            </div>
            <div>
              📝 <span className="font-semibold">{progress.quizzesTaken}</span>{" "}
              Quizzes
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

      {/* Quiz History */}
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="font-medium mb-3">Quiz History</h2>
        {quizHistory.length > 0 ? (
          <div className="space-y-4">
            {quizHistory.map((attempt) => {
              const expandedAns = expandedAnswers[attempt._id] || false;
              const highlight = latestAttemptId === attempt._id; // ✅ highlight if latest

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
                    onClick={() => retryQuiz(attempt.taskId, attempt._id)} // ✅ pass quizId
                    className="mt-3 px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Retake Quiz
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No quiz attempts yet.</p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              disabled={page === 1}
              onClick={() => fetchQuizHistory(page - 1)}
              className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => fetchQuizHistory(page + 1)}
              className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
