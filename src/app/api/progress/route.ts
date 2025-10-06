import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connect";
import Task from "../../../lib/models/Task";
import Quiz from "../../../lib/models/Quiz";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  /** 🧮 TASK STATS */
  const tasks = await Task.find({ user: user._id }).lean();

  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let completedTasks = 0;

  for (const t of tasks) {
    if (t.completed) completedTasks++;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      totalSubtasks += t.subtasks.length;
      completedSubtasks += t.subtasks.filter((s: any) => s.completed).length;
    }
  }

  let taskCompletionPercent = 0;
  if (tasks.length > 0 && totalSubtasks > 0) {
    const taskPercent = completedTasks / tasks.length;
    const subtaskPercent = completedSubtasks / totalSubtasks;
    taskCompletionPercent = ((taskPercent + subtaskPercent) / 2) * 100;
  } else if (tasks.length > 0) {
    taskCompletionPercent = (completedTasks / tasks.length) * 100;
  } else if (totalSubtasks > 0) {
    taskCompletionPercent = (completedSubtasks / totalSubtasks) * 100;
  }

  /** 🧠 QUIZ STATS */
  const quizzes = await Quiz.find({ user: user._id }).lean();
  const quizzesTaken = quizzes.length;

  let avgScore = 0;
  if (quizzesTaken > 0) {
    const totalScore = quizzes.reduce((acc, quiz) => {
      if (quiz.attempts && quiz.attempts.length > 0) {
        const lastAttempt = quiz.attempts[quiz.attempts.length - 1];
        const questionCount = lastAttempt.answers?.length || 1;
        acc += (lastAttempt.score / questionCount) * 100;
      }
      return acc;
    }, 0);

    avgScore = Math.round(totalScore / quizzesTaken) || 0;
  }

  /** 🔄 OVERALL SCORE (weighted 70% tasks, 30% quizzes) */
  const overall = Math.round(
    (taskCompletionPercent * 0.7) + (avgScore * 0.3)
  );

  /** 📊 FINAL RESPONSE */
  const progress = {
    completedTasks,
    totalTasks: tasks.length,
    completedSubtasks,
    totalSubtasks,
    quizzesTaken,
    avgScore: isNaN(avgScore) ? 0 : avgScore,
    percentage: isNaN(overall) ? 0 : overall,
  };

  return NextResponse.json(progress);
}
