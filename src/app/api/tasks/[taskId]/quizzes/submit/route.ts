// src/app/api/tasks/[taskId]/quizzes/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../../../lib/db/connect";
import Task from "../../../../../../lib/models/Task";
import { verifyToken } from "../../../../../../lib/utils/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  await connectDB();
  const { taskId } = await params;

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = verifyToken(token) as any;
  const userId = decoded?.uid;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await req.json();
  const { answers } = body as { answers: string[] }; // answers = ["main()", "int", ...]

  let score = 0;
  const detailedAnswers: { question: string; selected: string; correct: string }[] = [];

  (task.quizzes || []).forEach((q: any, i: number) => {
    const submitted = answers[i];

    // ✅ normalize: if answer is an index, map to option
    const selected =
      typeof submitted === "number" || /^[0-9]+$/.test(String(submitted))
        ? q.options[parseInt(submitted, 10)]
        : submitted;

    if (selected === q.correctAnswer) {
      score++;
    }

    detailedAnswers.push({
      question: q.question,
      selected: selected || "",
      correct: q.correctAnswer,
    });
  });

  const total = task.quizzes?.length || 0;
  const percentage = total > 0 ? (score / total) * 100 : 0;

  // ✅ keep history
  task.quizResults = [
    ...(task.quizResults || []),
    { score: percentage, answers: detailedAnswers, takenAt: new Date() },
  ];

  await task.save();

  return NextResponse.json({ score, total, percentage, answers: detailedAnswers });
}
