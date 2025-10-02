// src/app/api/tasks/[taskId]/subtasks/[subId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../../../lib/db/connect";
import Task from "../../../../../../lib/models/Task";
import { verifyToken } from "../../../../../../lib/utils/jwt";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string; subId: string } }
) {
  await connectDB();
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : auth;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = verifyToken(token) as any;
    const userId = decoded?.uid;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId, subId } = params;
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // locate subtask by _id
    const sub = task.subtasks.id(subId);
    if (!sub) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

    sub.completed = !sub.completed;
    await task.save();

    return NextResponse.json({ success: true, task });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}
