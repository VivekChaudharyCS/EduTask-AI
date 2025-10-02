import { useState } from "react";

type QuizAttempt = {
  score: number;
  date: string;
  answersDetail: {
    question: string;
    yourAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }[];
};

type QuizDoc = {
  _id: string;
  task?: { title: string };
  attempts: QuizAttempt[];
};

export default function QuizHistory({ quizzes }: { quizzes: QuizDoc[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6 col-span-2">
      <h2 className="text-lg font-semibold mb-4">Quiz History</h2>

      {quizzes.length === 0 ? (
        <p className="text-sm text-gray-500">No quiz history yet.</p>
      ) : (
        <div className="space-y-6">
          {quizzes.map((quiz) => {
            const isExpanded = expanded[quiz._id] || false;
            const visibleAttempts = isExpanded
              ? quiz.attempts
              : quiz.attempts.slice(0, 3);

            return (
              <div key={quiz._id} className="border rounded p-4">
                <h3 className="font-medium text-indigo-600 mb-2">
                  {quiz.task?.title || "Untitled Task"}
                </h3>

                {visibleAttempts.map((a, i) => (
                  <div key={i} className="mt-3 border-t pt-2">
                    <p className="text-sm font-medium">
                      Attempt {i + 1}: {a.score}/{a.answersDetail.length} •{" "}
                      {new Date(a.date).toLocaleString()}
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {a.answersDetail.map((ans, idx) => (
                        <li
                          key={idx}
                          className={`px-2 py-1 rounded ${
                            ans.isCorrect
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          <strong>Q:</strong> {ans.question}
                          <br />
                          <strong>Your Answer:</strong> {ans.yourAnswer}
                          {!ans.isCorrect && (
                            <>
                              <br />
                              <strong>Correct Answer:</strong>{" "}
                              {ans.correctAnswer}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {quiz.attempts.length > 3 && (
                  <button
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [quiz._id]: !isExpanded,
                      }))
                    }
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    {isExpanded ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
