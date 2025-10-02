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
      await loadTasks(); // refresh after create
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
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "retry", taskId: quizTask._id }),
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

  /** Initial load */
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /** Auto-open quiz after redirect */
  useEffect(() => {
    if (quizOpenedFromRedirect) return;

    const taskId = searchParams.get("taskId");
    const quizIdParam = searchParams.get("quizId");

    if (taskId && tasks.length > 0) {
      const task = tasks.find((t) => t._id === taskId);
      if (task) {
        handleTakeQuiz(task);
        if (quizIdParam) setQuizId(quizIdParam);
        setQuizOpenedFromRedirect(true);
      }
    }
  }, [tasks, searchParams, quizOpenedFromRedirect]);

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

        {/* Task list */}
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
              // ❌ removed onUpdated={loadTasks} to prevent loops
            />
          ))}

          {tasks.length === 0 && (
            <p className="text-gray-500 text-sm">No tasks yet. Create one above!</p>
          )}
        </div>

        {/* Quiz Section */}
        {quizTask && quiz.length > 0 && (
          <div className="mt-6 border p-4 rounded bg-white">
            <h2 className="font-medium mb-2">Quiz: {quizTask.title}</h2>

            {!quizResult ? (
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
              <>
                <p className="mt-2 font-semibold">
                  Your Score: {quizResult.score}/{quizResult.total}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}