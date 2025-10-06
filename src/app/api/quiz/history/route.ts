// app/api/quiz/history/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connect";
import { getUserFromReq } from "../../../../lib/utils/getUserFromReq";
import Quiz from "../../../../lib/models/Quiz";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    // 🧠 Fetch quizzes for this user
    const quizzes = await Quiz.find({ user: user._id })
      .populate("task", "title")
      .lean();

    // 🧩 Flatten attempts — include quizId and original questions
    const allAttempts = quizzes.flatMap((quiz: any, quizIndex: number) => {
      const quizQuestions =
        quiz.questions?.map((q: any) => ({
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
        })) || [];

      return (quiz.attempts || []).map((a: any, attemptIndex: number) => ({
        _id: a._id?.toString() || `${quiz._id}_${attemptIndex}`, // unique key
        quizId: quiz._id?.toString(),
        date: a.date,
        score: a.score,
        taskId: quiz.task?._id?.toString() || null,
        taskTitle: quiz.task?.title || "Untitled Task",

        // 🧩 Include the original quiz questions for context
        questions: quizQuestions,

        // 🧩 Include attempt answers (what user submitted)
        answers: (a.answers || []).map((ans: any) => ({
          question: ans.question,
          submitted: ans.submitted,
          correctAnswer: ans.correctAnswer,
          isCorrect: ans.isCorrect,
        })),
      }));
    });

    // 🕒 Sort latest first
    allAttempts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const total = allAttempts.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginated = allAttempts.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      attempts: paginated,
      page,
      totalPages,
      total,
    });
  } catch (err) {
    console.error("❌ Quiz history fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch quiz history" },
      { status: 500 }
    );
  }
}
