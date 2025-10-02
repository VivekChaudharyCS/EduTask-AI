import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connect";
import Quiz from "../../../lib/models/Quiz";
import Task from "../../../lib/models/Task";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";
import axios from "axios";

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // --- Generate Quiz ---
  if (body.action === "generate") {
    const { taskId } = body;
    const task = await Task.findById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    try {
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/quiz`,
        { topic: task.title, description: task.description || "" }
      );

      const rawQuestions = resp.data?.quiz || [];
      const questions = rawQuestions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer,
      }));

      const quiz = await Quiz.create({
        user: user._id,
        task: task._id,
        questions,
      });

      return NextResponse.json(quiz);
    } catch (err) {
      console.error("Quiz generation failed:", err);

      const fallbackQuestions = [
        {
          question: `What is "${task.title}" mainly about?`,
          options: ["Syntax", "Semantics", "Logic", "Compilation"],
          correctAnswer: "Syntax",
        },
        {
          question: `Which concept is most important in "${task.title}"?`,
          options: ["Loops", "Data Types", "Functions", "Pointers"],
          correctAnswer: "Functions",
        },
      ];

      const quiz = await Quiz.create({
        user: user._id,
        task: task._id,
        questions: fallbackQuestions,
      });

      return NextResponse.json(quiz);
    }
  }

  // --- Submit Quiz ---
  if (body.action === "submit") {
    const { quizId, answers } = body as { quizId: string; answers: string[] };
    const quiz = await Quiz.findById(quizId).populate("task", "title");
    if (!quiz)
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    let score = 0;
    const wrongTopics: string[] = [];

    const attemptDetails = quiz.questions.map((q: any, i: number) => {
      const submitted = answers[i];
      const correct = submitted === q.correctAnswer;
      if (correct) score++;
      else wrongTopics.push(q.question);

      return {
        question: q.question,
        submitted,
        correctAnswer: q.correctAnswer,
        isCorrect: correct,
      };
    });

    quiz.score = score;
    quiz.lastAttempt = new Date();

    const newAttempt = {
      score,
      date: new Date(),
      answers: attemptDetails,
    };

    quiz.attempts = [...(quiz.attempts || []), newAttempt];
    await quiz.save();

    const attemptId = quiz.attempts[quiz.attempts.length - 1]._id?.toString();

    let roadmap: string[] = [];
    try {
      const prompt = `The user attempted a quiz on "${
        quiz.task.title
      }" and scored ${score}/${quiz.questions.length}.
Wrong topics: ${wrongTopics.join(", ") || "None"}.
Generate a short 5-step improvement roadmap focusing on weak areas.`;

      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/roadmap`,
        { prompt }
      );

      roadmap = resp.data?.roadmap || [];
    } catch (err) {
      console.error("Roadmap generation failed:", err);
      roadmap = [
        "Review the fundamentals again",
        "Practice exercises on weak areas",
        "Revisit tutorials or videos",
        "Attempt small coding problems",
        "Retake the quiz after practice",
      ];
    }

    return NextResponse.json({
      attemptId,
      score,
      total: quiz.questions.length,
      roadmap,
      answers: attemptDetails,
    });
  }

  // --- Retry Quiz (Reuse if exists) ---
  if (body.action === "retry") {
    const { taskId } = body;
    const task = await Task.findById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // ✅ Check if an existing quiz already exists for this user + task
    let quiz = await Quiz.findOne({ user: user._id, task: task._id }).sort({
      createdAt: -1,
    });

    if (quiz) {
      // just return the existing quiz
      return NextResponse.json({
        _id: quiz._id,
        task: quiz.task,
        questions: quiz.questions,
      });
    }

    // ❌ if no quiz found → generate a new one
    try {
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/quiz`,
        { topic: task.title, description: task.description || "" }
      );

      const rawQuestions = resp.data?.quiz || [];
      const questions = rawQuestions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer,
      }));

      quiz = await Quiz.create({
        user: user._id,
        task: task._id,
        questions,
        score: 0,
        attempts: [],
      });

      return NextResponse.json({
        _id: quiz._id,
        task: quiz.task,
        questions: quiz.questions,
      });
    } catch (err) {
      console.error("Quiz retry failed:", err);
      return NextResponse.json({
        _id: "fallback",
        task: taskId,
        questions: [
          {
            question: "Placeholder: What is a variable in programming?",
            options: ["Storage unit", "Operator", "Function", "Loop"],
            correctAnswer: "Storage unit",
          },
        ],
      });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
