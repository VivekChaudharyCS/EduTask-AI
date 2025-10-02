// src/app/api/tasks/[taskId]/quizzes/generate/route.ts
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
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const task = await Task.findById(taskId);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    // Call Gemini ML service
    const resp = await axios.post(`${process.env.ML_SERVICE_URL}/quiz`, {
      topic: task.title,
      description: task.description || "",
    });

    // ✅ Normalize quiz schema: always use `correctAnswer`
    const quizzes = (resp.data?.quiz || []).map((q: any) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer || q.answer, // fallback to `answer`
    }));

    task.quizzes = [...(task.quizzes || []), ...quizzes];
    await task.save();

    return NextResponse.json({ quizzes });
  } catch (e) {
    console.error("Quiz generation failed:", e);
    return NextResponse.json(
      {
        quizzes: [
          {
            question: "Fallback: What is a variable in programming?",
            options: ["Storage unit", "Operator", "Function", "Loop"],
            correctAnswer: "Storage unit",
          },
        ],
      },
      { status: 200 }
    );
  }
}
