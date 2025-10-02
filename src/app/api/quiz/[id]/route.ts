// /app/api/quiz/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connect";
import Quiz from "../../../../lib/models/Quiz";
import { getUserFromReq } from "../../../../lib/utils/getUserFromReq";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await Quiz.findOne({ _id: params.id, user: user._id }).populate("task", "title");
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  return NextResponse.json({
    _id: quiz._id.toString(),
    taskId: quiz.task._id.toString(),
    taskTitle: quiz.task.title,
    questions: quiz.questions,
    attempts: quiz.attempts || [],
  });
}
