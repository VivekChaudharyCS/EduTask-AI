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
        {
          topic: task.title,
          description: task.description || "",
        }
      );

      // ✅ Normalize to schema
      const rawQuestions = resp.data?.quiz || [];
      const questions = rawQuestions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer, // normalize here
      }));

      const quiz = await Quiz.create({
        user: user._id,
        task: task._id,
        questions,
      });
      return NextResponse.json(quiz);
    } catch (err) {
      console.error("Quiz generation failed:", err);

      // fallback quiz
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
    const quiz = await Quiz.findById(quizId);
    if (!quiz)
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    let score = 0;
    const wrongTopics: string[] = [];

    quiz.questions.forEach((q: any, i: number) => {
      const submitted = answers[i];

      // submitted is already the option text from TaskItem.tsx
      if (submitted === q.correctAnswer) {
        score++;
      } else {
        wrongTopics.push(q.question);
      }
    });

    quiz.score = score;
    quiz.lastAttempt = new Date();
    quiz.attempts = [...(quiz.attempts || []), { score, date: new Date() }];
    await quiz.save();

    // ✅ Roadmap generation (same as before)
    let roadmap: string[] = [];
    try {
      const prompt = `The user attempted a quiz on "${
        quiz.task
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

    return NextResponse.json({ score, total: quiz.questions.length, roadmap });
  }

  // --- Retry Quiz ---
  if (body.action === "retry") {
    const { taskId } = body;
    const task = await Task.findById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    try {
      const resp = await axios.post(
        `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/quiz`,
        {
          topic: task.title,
          description: task.description || "",
        }
      );

      const rawQuestions = resp.data?.quiz || [];
      const questions = rawQuestions.map((q: any) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || q.answer,
      }));

      const quiz = await Quiz.findOneAndUpdate(
        { task: task._id, user: user._id },
        { questions, score: 0, lastAttempt: null, attempts: [] },
        { new: true, upsert: true }
      );

      return NextResponse.json(quiz);
    } catch (err) {
      console.error("Quiz retry failed:", err);
      return NextResponse.json({
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
