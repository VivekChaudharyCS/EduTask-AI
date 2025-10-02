// src\app\api\tasks\[taskId]\subtasks\generate\route.ts

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

  try {
    const decoded = verifyToken(token) as any;
    const userId = decoded?.uid;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await params;
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // ✅ Call ML service Gemini subtasks
    let subtasks: { title: string; completed: boolean }[] = [];
    try {
      console.log(task.title);
      console.log(task.description);
      const resp = await axios.post(`${process.env.NEXT_PUBLIC_ML_SERVICE_URL}/subtasks`, {
        title: task.title,
        description: task.description || "",
      });
      const mlData = resp.data || {};
      console.log(mlData);
      if (Array.isArray(mlData.subtasks)) {
        subtasks = mlData.subtasks.map((s: string) => ({
          title: s,
          completed: false,
        }));
      }
    } catch (err) {
      console.error("ML service failed, using fallback:", err);
      subtasks = [
        { title: `Understand ${task.title}`, completed: false },
        { title: `Review examples for ${task.title}`, completed: false },
        { title: `Practice ${task.title} problems`, completed: false },
      ];
    }

    // Merge unique subtasks
    const existingTitles = new Set(task.subtasks?.map(s => s.title) || []);
    task.subtasks = [
      ...(task.subtasks || []),
      ...subtasks.filter(s => !existingTitles.has(s.title)),
    ];

    await task.save();
    return NextResponse.json(task);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}
