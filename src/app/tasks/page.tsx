"use client";

import { useEffect, useState, useCallback } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";
import TaskItem from "../../components/tasks/TaskItem";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useSearchParams } from "next/navigation";

type Subtask = { _id?: string; title: string; completed: boolean };
type TaskDoc = {
  _id: string;
  title: string;
  description?: string;
  completed?: boolean;
  subtasks?: Subtask[];
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type QuizResult = {
  score: number;
  total: number;
  roadmap: string[];
  answers: {
    question: string;
    submitted: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
};

type Resource = { title: string; url: string; type?: string };

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // quiz state
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizTask, setQuizTask] = useState<TaskDoc | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // recommendations
  const [recommendations, setRecommendations] = useState<Resource[]>([]);
  const [recNotice, setRecNotice] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string>("");

  const searchParams = useSearchParams();
  const [quizOpenedFromRedirect, setQuizOpenedFromRedirect] = useState(false);

  /** ✅ stable function */
  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(Array.isArray(data) ? (data as TaskDoc[]) : []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, []);

  /** Create new task */
  async function createTask() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setTitle("");
      setDescription("");
      await loadTasks();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  /** Take quiz */
  async function handleTakeQuiz(task: TaskDoc) {
    setQuiz([]);
    setAnswers({});
    setQuizTask(task);
    setQuizResult(null);
    setQuizId(null);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "generate", taskId: task._id }),
      });
      const data = await res.json();
      setQuiz(data.questions || []);
      setQuizId(data._id || null);
    } catch (e) {
      console.error("Quiz fetch failed:", e);
    }
  }

  async function submitQuiz() {
    if (!quizTask || !quizId) return;
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "submit",
          quizId,
          answers: quiz.map((_, idx) => answers[idx] || ""),
        }),
      });
      const data = await res.json();
      setQuizResult(data);
    } catch (e) {
      console.error("Quiz submit failed:", e);
    }
  }

  async function retryQuiz() {
    if (!quizTask) return;

    try {
      if (quizId) {
        const existing = await fetch(`/api/quiz/${quizId}`, {
          headers: { ...authHeaders() },
        });

        if (existing.ok) {
          const data = await existing.json();
          setQuiz(data.questions || []);
          setQuizId(data._id);
          setAnswers({});
          setQuizResult(null);
          console.log("✅ Loaded existing quiz:", data._id);
          return;
        }
      }

      // 🔄 If quiz not found, generate new
      console.warn("⚠️ Existing quiz not found, generating new one...");
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "generate", taskId: quizTask._id }),
      });
      const data = await res.json();

      setQuiz(data.questions || []);
      setQuizId(data._id || null);
      setAnswers({});
      setQuizResult(null);
    } catch (e) {
      console.error("Quiz retry failed:", e);
    }
  }

  /** ✅ Handle Recommendations and Save to LocalStorage */
  async function handleRecommend(query: string) {
    setRecNotice("Fetching recommendations...");
    setRecommendations([]);
    setPlayerUrl("");

    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      const mapped = Array.isArray(data)
        ? data
        : data.resources || data.items || [];

      const formatted = (mapped as any[]).map((r) => ({
        title: r.title || "Untitled",
        url: r.url || "#",
        type:
          r.type ||
          (typeof r.url === "string" && r.url.includes("youtube")
            ? "youtube"
            : "link"),
      }));

      // ✅ Save to state and localStorage
      setRecommendations(formatted);
      localStorage.setItem("recommendedResources", JSON.stringify(formatted));

      setRecNotice(
        formatted.length > 0
          ? `Fetched ${formatted.length} resources for "${query}".`
          : "No recommendations found."
      );
    } catch (err) {
      console.error("Recommendation failed:", err);
      setRecNotice("Failed to fetch recommendations.");
    }
  }

  /** Initial load */
  useEffect(() => {
    loadTasks();

    // ✅ Restore recommendations from localStorage
    const stored = localStorage.getItem("recommendedResources");
    if (stored) {
      const parsed = JSON.parse(stored);
      setRecommendations(parsed);
      setRecNotice(`Loaded ${parsed.length} saved recommendations.`);
    }
  }, [loadTasks]);

  useEffect(() => {
    console.log("📘 Quiz state updated:", {
      quizTask,
      quizId,
      quizLength: quiz.length,
    });
  }, [quizTask, quizId, quiz.length]);

  /** Auto-open quiz after redirect (fixed and safe) */
  /** ✅ Auto-open quiz after redirect (stable fix for retake flow) */
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    const quizIdParam = searchParams.get("quizId");

    // 🚫 no params, skip
    if (!taskId && !quizIdParam) return;

    // 👇 reset previous quiz state (so it re-renders cleanly)
    setQuiz([]);
    setQuizTask(null);
    setQuizId(null);
    setQuizResult(null);
    setAnswers({});

    let cancelled = false;

    (async () => {
      try {
        if (quizIdParam) {
          console.log("🔍 Loading quiz from redirect:", quizIdParam);
          const res = await fetch(`/api/quiz/${quizIdParam}`, {
            headers: { ...authHeaders() },
          });

          if (!res.ok) {
            console.warn("⚠️ Quiz not found, skipping render.");
            return;
          }

          const data = await res.json();
          if (cancelled) return;

          console.log("🧩 Received quiz data from API:", data);

          // ✅ set all quiz states
          setQuiz(data.questions || []);
          setQuizId(data._id);
          setQuizTask({
            _id: data.taskId,
            title: data.taskTitle,
            description: "",
          });
          setQuizOpenedFromRedirect(true);

          console.log("✅ Quiz loaded successfully:", data._id);
        } else if (taskId) {
          const task = tasks.find((t) => t._id === taskId);
          if (task) {
            console.log("🧠 Generating quiz for task:", task.title);
            await handleTakeQuiz(task);
            if (!cancelled) setQuizOpenedFromRedirect(true);
          }
        }
      } catch (err) {
        console.error("❌ Quiz auto-load failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, tasks]);

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <h1 className="text-2xl font-semibold">Tasks</h1>

        {/* Task Creation */}
        <div className="bg-white p-4 rounded shadow-sm border mb-6">
          <h2 className="font-medium mb-2">Create New Task</h2>
          {msg && <p className="text-red-500 text-sm mb-2">{msg}</p>}
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2 text-sm"
          />
          <button
            onClick={createTask}
            disabled={loading || !title.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Creating..." : "Add Task"}
          </button>
        </div>

        {/* ✅ Recommendation Panel */}
        {recNotice && <p className="text-sm text-gray-500 mt-4">{recNotice}</p>}

        {recommendations.length > 0 && (
          <div className="mt-4 border rounded-lg bg-white shadow-sm p-4">
            <h3 className="font-semibold mb-2">Recommended Resources</h3>
            <ul className="space-y-2 text-sm">
              {recommendations.map((r, i) => (
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
                    typeof r.url === "string" &&
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

            {/* YouTube Player */}
            {playerUrl && (
              <div className="mt-4">
                <iframe
                  width="100%"
                  height="300"
                  src={`https://www.youtube.com/embed/${
                    playerUrl.split("v=")[1]?.split("&")[0]
                  }`}
                  title="YouTube Player"
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
                <button
                  onClick={() => setPlayerUrl("")}
                  className="mt-2 text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
                >
                  Close Player
                </button>
              </div>
            )}
          </div>
        )}

        {/* Task List */}
        <div className="grid gap-4">
          {tasks.map((t) => (
            <TaskItem
              key={t._id}
              task={{
                ...t,
                description: t.description ?? "",
                subtasks: t.subtasks ?? [],
              }}
              onTakeQuiz={handleTakeQuiz}
              onRecommend={handleRecommend}
            />
          ))}

          {tasks.length === 0 && (
            <p className="text-gray-500 text-sm">
              No tasks yet. Create one above!
            </p>
          )}
        </div>

        {/* Quiz Section */}
        {/* Quiz Section */}
        {(quizTask || quiz.length > 0) && (
          <div className="mt-6 border p-4 rounded bg-white">
            <h2 className="font-medium mb-2">
              Quiz: {quizTask?.title || "Loading..."}
            </h2>

            {!quizResult ? (
              quiz.length > 0 ? (
                <>
                  <ul className="space-y-4">
                    {quiz.map((q, idx) => (
                      <li key={idx}>
                        <p className="font-medium">{q.question}</p>
                        <div className="mt-1 space-y-1">
                          {q.options.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`q-${idx}`}
                                value={opt}
                                checked={answers[idx] === opt}
                                onChange={() =>
                                  setAnswers({ ...answers, [idx]: opt })
                                }
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex gap-3">
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                      onClick={submitQuiz}
                    >
                      Submit Quiz
                    </button>
                    <button
                      className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
                      onClick={retryQuiz}
                    >
                      Retry Quiz
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">Loading quiz...</p>
              )
            ) : (
              <p className="mt-2 font-semibold">
                Your Score: {quizResult.score}/{quizResult.total}
              </p>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
