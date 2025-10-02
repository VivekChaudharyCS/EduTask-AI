// src/app/api/tasks/[taskId]/quizzes/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../../../lib/db/connect";
import Task from "../../../../../../lib/models/Task";
import { verifyToken } from "../../../../../../lib/utils/jwt";
import axios from "axios";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  await connectDB();

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = verifyToken(token) as any;
  const userId = decoded?.uid;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  try {
    const resp = await axios.post(`${process.env.ML_SERVICE_URL}/quiz`, {
      topic: task.title,
      description: task.description || "",
    });

    // ✅ normalize questions to always include `correctAnswer`
    const newQuiz = (resp.data?.quiz || []).map((q: any) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer || q.answer,
    }));

    // ✅ reset old quiz data
    task.quizzes = newQuiz;
    task.quizResults = [];
    await task.save();

    // ✅ match frontend expectation (same as "generate")
    return NextResponse.json({
      _id: task._id,
      quizzes: newQuiz,
      quizResults: [],
    });
  } catch (e) {
    console.error("Quiz retry failed:", e);

    // ✅ fallback quiz
    return NextResponse.json(
      {
        _id: taskId,
        quizzes: [
          {
            question: "Placeholder: What is a variable in programming?",
            options: ["Storage unit", "Operator", "Function", "Loop"],
            correctAnswer: "Storage unit",
          },
        ],
        quizResults: [],
      },
      { status: 200 }
    );
  }
}
