// app/api/quiz/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connect";
import Quiz from "../../../../lib/models/Quiz";
import { getUserFromReq } from "../../../../lib/utils/getUserFromReq";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const quizId = id;

  console.log("🔍 Fetching quiz:", quizId, "for user:", user._id);

  try {
    const quiz = await Quiz.findOne({
      _id: quizId,
      user: user._id,
    }).populate("task", "title");

    if (!quiz) {
      console.warn("⚠️ No quiz found in DB for ID:", quizId);
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    console.log("✅ Quiz fetched successfully:", quiz._id.toString());

    // ✅ Always include questions (so options render correctly)
    const questions =
      Array.isArray(quiz.questions) && quiz.questions.length > 0
        ? quiz.questions.map((q) => ({
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
          }))
        : [];

    // ✅ Include attempts (history)
    const attempts = Array.isArray(quiz.attempts)
      ? quiz.attempts.map((a: any, i: number) => ({
          _id: a._id?.toString() || `${quiz._id}_${i}`,
          date: a.date,
          score: a.score,
          answers: (a.answers || []).map((ans: any) => ({
            question: ans.question,
            submitted: ans.submitted,
            correctAnswer: ans.correctAnswer,
            isCorrect: ans.isCorrect,
          })),
        }))
      : [];

    return NextResponse.json({
      _id: quiz._id.toString(),
      taskId: quiz.task?._id?.toString() || null,
      taskTitle: quiz.task?.title || "Untitled Task",
      questions, // ✅ ensures “Retake Quiz” shows options
      attempts,
    });
  } catch (err) {
    console.error("❌ Quiz fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
