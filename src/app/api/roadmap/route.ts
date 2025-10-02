// src/app/api/roadmap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";
import { connectDB } from "../../../lib/db/connect";
import Task from "../../../lib/models/Task";
import Roadmap from "../../../lib/models/Roadmap"; // ✅ use DB model
import axios from "axios";

export async function GET(req: NextRequest) {
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const roadmapDoc = await Roadmap.findOne({ user: user._id }).lean();
  return NextResponse.json({ roadmap: roadmapDoc?.steps || [] });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const tasks = await Task.find({ user: user._id }).lean();
  const taskTitles = tasks.map((t) => t.title).join(", ");

  const body = await req.json().catch(() => ({}));
  const { prompt } = body;

  const finalPrompt =
    prompt || `Generate a personalized learning roadmap for these tasks: ${taskTitles}`;

  try {
    const resp = await axios.post(
      `${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/roadmap`,
      { prompt: finalPrompt }
    );

    // ✅ Normalize Gemini/ML response into a clean array of strings
    const raw = resp.data;
    let roadmap: string[] = [];

    if (Array.isArray(raw.roadmap)) {
      roadmap = raw.roadmap;
    } else if (Array.isArray(raw.roadmap?.roadmap)) {
      roadmap = raw.roadmap.roadmap;
    } else if (typeof raw === "string") {
      roadmap = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    } else if (raw && typeof raw.text === "string") {
      roadmap = raw.text.split("\n").map((l: string) => l.trim()).filter(Boolean);
    }

    // ✅ Save to DB (upsert per user)
    await Roadmap.findOneAndUpdate(
      { user: user._id },
      { steps: roadmap },
      { upsert: true, new: true }
    );

    return NextResponse.json({ roadmap });
  } catch (e) {
    console.error("Roadmap generation failed:", e);

    const fallback = [
      "Understand fundamentals",
      "Review tutorials",
      "Practice coding problems",
      "Take quizzes",
      "Advance to next level",
    ];

    // ✅ Save fallback too, so GET always returns something
    await Roadmap.findOneAndUpdate(
      { user: user._id },
      { steps: fallback },
      { upsert: true, new: true }
    );

    return NextResponse.json({ roadmap: fallback }, { status: 200 });
  }
}
