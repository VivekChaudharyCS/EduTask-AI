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
  onUpdated?: () => Promise<void>; // optional parent refresh
  onTakeQuiz: (task: Task) => void;
  onRecommend?: (query: string) => Promise<void>;
};

export default function TaskItem({ task, onUpdated, onTakeQuiz, onRecommend }: Props) {
  const [loading, setLoading] = useState(false);
  const [subtaskLoadingId, setSubtaskLoadingId] = useState<string | null>(null);

  // Local optimistic state
  const [localTask, setLocalTask] = useState<Task>(task);

  const completedCount = localTask.subtasks.filter((s) => s.completed).length;
  const totalCount = localTask.subtasks.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ✅ toggle full task
  async function toggleTaskComplete() {
    const newCompleted = !localTask.completed;
    setLocalTask({
      ...localTask,
      completed: newCompleted,
      subtasks: localTask.subtasks.map((s) => ({ ...s, completed: newCompleted })),
    });

    try {
      setLoading(true);
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "toggle-task-done",
          taskId: localTask._id,
        }),
      });
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error("Toggle task failed:", err);
    } finally {
      setLoading(false);
    }
  }

  // ✅ toggle single subtask
  async function toggleSubtask(s: Subtask) {
    if (!s._id) return;
    const updatedSubtasks = localTask.subtasks.map((sub) =>
      sub._id === s._id ? { ...sub, completed: !sub.completed } : sub
    );

    // Optimistic UI update
    setLocalTask({
      ...localTask,
      subtasks: updatedSubtasks,
      completed: updatedSubtasks.every((st) => st.completed),
    });

    try {
      setSubtaskLoadingId(s._id);
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "update-subtasks",
          taskId: localTask._id,
          subtasks: updatedSubtasks,
        }),
      });
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error("Toggle subtask failed:", err);
    } finally {
      setSubtaskLoadingId(null);
    }
  }

  // ✅ delete task
  async function deleteTask() {
    if (!confirm("Delete this task?")) return;
    try {
      setLoading(true);
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ taskId: localTask._id }),
      });
      if (onUpdated) await onUpdated();
    } finally {
      setLoading(false);
    }
  }

  // ✅ generate subtasks
  async function generateSubtasks() {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "generate-subtasks",
          taskId: localTask._id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.subtasks) {
        setLocalTask({ ...localTask, subtasks: data.subtasks });
      }
      if (onUpdated) await onUpdated();
    } finally {
      setLoading(false);
    }
  }

  // ✅ delete subtask
  async function deleteSubtask(s: Subtask) {
    if (!s._id) return;
    if (!confirm("Delete this subtask?")) return;

    // Optimistic update
    setLocalTask({
      ...localTask,
      subtasks: localTask.subtasks.filter((st) => st._id !== s._id),
    });

    try {
      setSubtaskLoadingId(s._id);
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ taskId: localTask._id, subtaskId: s._id }),
      });
      if (onUpdated) await onUpdated();
    } finally {
      setSubtaskLoadingId(null);
    }
  }

  async function recommend() {
    if (onRecommend) {
      await onRecommend(localTask.title);
    } else {
      try {
        setLoading(true);
        await fetch("/api/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ query: localTask.title }),
        });
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
          <h3 className="font-semibold text-gray-800">{localTask.title}</h3>
          {localTask.description && (
            <p className="text-sm text-gray-500">{localTask.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onTakeQuiz(localTask)}
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
          value={localTask.completed ? "Completed" : "In Progress"}
          onChange={toggleTaskComplete}
          disabled={loading}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      {/* Subtasks */}
      {localTask.subtasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Subtasks</h4>
          {localTask.subtasks.map((s) => (
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
