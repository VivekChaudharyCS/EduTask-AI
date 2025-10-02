"use client";

import { useEffect, useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";
import TaskItem from "../../components/tasks/TaskItem";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

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
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [improvementRoadmap, setImprovementRoadmap] = useState<string[]>([]);

  // resources state (for this page)
  const [resources, setResources] = useState<Resource[]>([]);
  const [playerUrl, setPlayerUrl] = useState<string>("");
  const [notice, setNotice] = useState<string | null>(null);

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks", { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(Array.isArray(data) ? (data as TaskDoc[]) : []);
    } catch {}
  }

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
      const message = e instanceof Error ? e.message : "Unknown error";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  // quiz handlers
  async function handleTakeQuiz(task: TaskDoc) {
    setQuiz([]);
    setAnswers({});
    setQuizTask(task);
    setQuizScore(null);
    setImprovementRoadmap([]);
    setQuizId(null);

    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "generate",
          taskId: task._id,
        }),
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
      setQuizScore(data.score);
      setImprovementRoadmap(data.roadmap || []);
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
        body: JSON.stringify({
          action: "retry",
          taskId: quizTask._id,
        }),
      });
      const data = await res.json();
      setQuiz(data.questions || []);
      setQuizId(data._id || null);
      setAnswers({});
      setQuizScore(null);
      setImprovementRoadmap([]);
    } catch (e) {
      console.error("Quiz retry failed:", e);
    }
  }

  // resources (recommendation)
  async function callRecommend(query: string) {
    setNotice(null);
    setResources([]);
    setPlayerUrl("");
    if (!query || !query.trim()) {
      setNotice("Please provide a search query.");
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

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <h1 className="text-2xl font-semibold">Tasks</h1>

        {/* Create Task */}
        <div className="bg-white border p-6 rounded-lg shadow-sm">
          <h2 className="font-medium mb-3">Create New Task</h2>
          <div className="flex flex-col gap-3">
            <input
              className="border rounded px-3 py-2 focus:outline-none focus:ring focus:border-indigo-400"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border rounded px-3 py-2 focus:outline-none focus:ring focus:border-indigo-400"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button
                disabled={loading}
                onClick={createTask}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Add Task"}
              </button>
              {msg && <p className="text-sm text-red-500">{msg}</p>}
            </div>
          </div>
        </div>

        {/* Resources Panel (Tasks page) */}
        <div className="bg-white border p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Recommended Resources</h3>
            <div className="flex gap-2">
              <input
                placeholder="Search resources or use task 'Get Recommendations'"
                className="border rounded px-3 py-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    callRecommend((e.target as HTMLInputElement).value);
                }}
              />
              <button
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    "input[placeholder^='Search resources']"
                  );
                  callRecommend(el?.value || "");
                }}
                className="text-sm px-3 py-1 rounded bg-indigo-600 text-white"
              >
                Search
              </button>
            </div>
          </div>

          {notice && <p className="text-xs text-gray-600 mb-2">{notice}</p>}

          {resources.length > 0 ? (
            <div className="space-y-3">
              {resources.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-gray-500">{r.type}</div>
                  </div>
                  {r.type === "youtube" &&
                  typeof r.url === "string" &&
                  r.url.includes("youtube.com/watch") ? (
                    <button
                      className="text-indigo-600 text-sm"
                      onClick={() => setPlayerUrl(r.url)}
                    >
                      Play
                    </button>
                  ) : (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 text-sm"
                    >
                      Open
                    </a>
                  )}
                </div>
              ))}

              {playerUrl && (
                <div className="mt-2">
                  <iframe
                    width="100%"
                    height="300"
                    src={`https://www.youtube.com/embed/${
                      playerUrl.split("v=")[1]?.split("&")[0]
                    }`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    onClick={() => setPlayerUrl("")}
                    className="mt-2 text-xs px-2 py-1 bg-gray-100 rounded"
                  >
                    Close player
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No resources yet. Use the search or per-task button.
            </p>
          )}
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
              onUpdated={loadTasks}
              onTakeQuiz={handleTakeQuiz}
              onRecommend={callRecommend} // pass handler for per-task recommend
            />
          ))}

          {tasks.length === 0 && (
            <p className="text-gray-500 text-sm">
              No tasks yet. Create one above!
            </p>
          )}
        </div>

        {/* Quiz Section */}
        {quizTask && quiz.length > 0 && (
          <div className="mt-6 border p-4 rounded bg-white">
            <h2 className="font-medium mb-2">Quiz: {quizTask.title}</h2>
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

            {quizScore !== null && (
              <p className="mt-2 font-semibold">
                Your Score: {quizScore}/{quiz.length}
              </p>
            )}

            {improvementRoadmap.length > 0 && (
              <div className="mt-4 bg-gray-50 p-3 rounded">
                <h3 className="font-medium mb-2">Improvement Roadmap</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {improvementRoadmap.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
