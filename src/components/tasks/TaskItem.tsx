"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";
import ProgressBar from "../ui/ProgressBar";

type Subtask = { _id?: string; title: string; completed: boolean };
type Task = {
  _id: string;
  title: string;
  description?: string;
  completed?: boolean;
  subtasks: Subtask[];
};
type Props = {
  task: Task;
  onUpdated: () => Promise<void>;
  onTakeQuiz: (task: Task) => void;
  onRecommend?: (query: string) => Promise<void>; // optional parent handler
};

export default function TaskItem({ task, onUpdated, onTakeQuiz, onRecommend }: Props) {
  const [loading, setLoading] = useState(false);
  const [subtaskLoadingId, setSubtaskLoadingId] = useState<string | null>(null);

  const completedCount = task.subtasks.filter((s) => s.completed).length;
  const totalCount = task.subtasks.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function toggleTaskComplete() {
    try {
      setLoading(true);
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "toggle-task-done",
          taskId: task._id,
        }),
      });
      await onUpdated();
    } finally {
      setLoading(false);
    }
  }

  async function toggleSubtask(s: Subtask) {
    if (!s._id) return;
    try {
      setSubtaskLoadingId(s._id);
      const updatedSubtasks = task.subtasks.map((sub) =>
        sub._id === s._id ? { ...sub, completed: !sub.completed } : sub
      );

      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "update-subtasks",
          taskId: task._id,
          subtasks: updatedSubtasks,
        }),
      });
      await onUpdated();
    } finally {
      setSubtaskLoadingId(null);
    }
  }

  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    try {
      setLoading(true);
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ taskId: task._id }),
      });
      await onUpdated();
    } finally {
      setLoading(false);
    }
  }

  async function generateSubtasks() {
    try {
      setLoading(true);
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "generate-subtasks",
          taskId: task._id,
        }),
      });
      await onUpdated();
    } finally {
      setLoading(false);
    }
  }

  async function deleteSubtask(s: Subtask) {
    if (!s._id) return;
    if (!confirm("Delete this subtask?")) return;
    try {
      setSubtaskLoadingId(s._id);
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ taskId: task._id, subtaskId: s._id }),
      });
      await onUpdated();
    } finally {
      setSubtaskLoadingId(null);
    }
  }

  // call parent-provided recommendation handler if present
  async function recommend() {
    if (onRecommend) {
      await onRecommend(task.title);
    } else {
      // fallback: try local call (best-effort)
      try {
        setLoading(true);
        await fetch("/api/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ query: task.title }),
        });
        // parent should refresh UI if needed
      } catch (err) {
        console.error("Recommendation failed:", err);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
      {/* Title + actions */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-500">{task.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onTakeQuiz(task)}
            className="text-xs text-green-600 hover:underline"
          >
            Take Quiz
          </button>

          <button
            onClick={recommend}
            className="text-xs text-blue-600 hover:underline"
            disabled={loading}
          >
            Get Recommendations
          </button>

          <button
            onClick={generateSubtasks}
            className="text-xs text-indigo-600 hover:underline"
          >
            Generate Subtasks
          </button>
          <button
            onClick={deleteTask}
            className="text-xs text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar value={progress} />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{totalCount} subtasks</span>
        <span>{progress}%</span>
      </div>

      {/* Task completion */}
      <div>
        <label className="text-sm mr-2">Task Status:</label>
        <select
          value={task.completed ? "Completed" : "In Progress"}
          onChange={toggleTaskComplete}
          disabled={loading}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Subtasks list */}
      {task.subtasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Subtasks</h4>
          {task.subtasks.map((s) => (
            <div
              key={s._id || s.title}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.completed}
                  onChange={() => toggleSubtask(s)}
                  disabled={subtaskLoadingId === s._id}
                />
                <span
                  className={`text-sm ${
                    s.completed ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <button
                onClick={() => deleteSubtask(s)}
                className="text-xs text-red-500 hover:underline"
                disabled={subtaskLoadingId === s._id}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
