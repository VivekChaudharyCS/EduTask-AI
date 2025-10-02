"use client";

import { useState } from "react";
import { authHeaders } from "../../lib/utils/clientAuth";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type Props = {
  taskId: string;
  taskTitle: string;
  description?: string;
  onClose: () => void;
};

export default function QuizModal({ taskId, taskTitle, description, onClose }: Props) {
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [roadmap, setRoadmap] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Generate Quiz ---
  async function generateQuiz() {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "generate", taskId }),
      });
      const data = await res.json();
      setQuiz(data.questions || []);
      setQuizId(data._id || null);
      setAnswers({});
      setScore(null);
      setRoadmap([]);
    } finally {
      setLoading(false);
    }
  }

  // --- Submit Quiz ---
  async function submitQuiz() {
    if (!quizId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "submit",
          quizId,
          answers: quiz.map((_, i) => answers[i] || ""),
        }),
      });
      const data = await res.json();
      setScore(data.score);
      setRoadmap(data.roadmap || []);
    } finally {
      setLoading(false);
    }
  }

  // --- Retry Quiz ---
  async function retryQuiz() {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "retry", taskId }),
      });
      const data = await res.json();
      setQuiz(data.questions || []);
      setQuizId(data._id || null);
      setAnswers({});
      setScore(null);
      setRoadmap([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Quiz: {taskTitle}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✖
          </button>
        </div>

        {/* Generate Quiz */}
        {quiz.length === 0 && (
          <button
            onClick={generateQuiz}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            {loading ? "Loading..." : "Start Quiz"}
          </button>
        )}

        {/* Questions */}
        {quiz.length > 0 && (
          <div className="space-y-4">
            {quiz.map((q, idx) => (
              <div key={idx} className="border rounded p-3">
                <p className="font-medium">{q.question}</p>
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`q-${idx}`}
                        value={opt}
                        checked={answers[idx] === opt}
                        onChange={() => setAnswers({ ...answers, [idx]: opt })}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {quiz.length > 0 && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={submitQuiz}
              disabled={loading}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Submit
            </button>
            <button
              onClick={retryQuiz}
              disabled={loading}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Score + Roadmap */}
        {score !== null && (
          <div className="mt-4">
            <p className="font-semibold">
              Score: {score}/{quiz.length}
            </p>
            {roadmap.length > 0 && (
              <div className="mt-2">
                <h5 className="font-medium">Improvement Roadmap:</h5>
                <ul className="list-disc pl-5 text-sm mt-1 space-y-1">
                  {roadmap.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
