// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connect";
import Task from "../../../lib/models/Task";
import Progress from "../../../lib/models/Progress";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";
import { mlClient } from "../../../lib/utils/mlClient";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await Task.find({ user: user._id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Create task (auto-generate subtasks)
  if (body.title) {
    const title = String(body.title);
    const description = body.description ? String(body.description) : "";

    let subtasks: { title: string; completed: boolean }[] = [];
    try {
      const mlResp = await mlClient.post("/analyze", { text: `${title}\n\n${description}` });
      const mlData = mlResp.data || {};
      if (Array.isArray(mlData.subtasks) && mlData.subtasks.length > 0) {
        subtasks = mlData.subtasks.map((s: any) =>
          typeof s === "string"
            ? { title: s, completed: false }
            : { title: s.title || String(s), completed: false }
        );
      } else if (Array.isArray(mlData.keywords) && mlData.keywords.length > 0) {
        subtasks = mlData.keywords
          .slice(0, 6)
          .map((k: string) => ({ title: `Study ${k}`, completed: false }));
      }
    } catch (e) {
      console.warn("ML analyze failed:", e?.message || e);
    }

    if (!Array.isArray(subtasks) || subtasks.length === 0) {
      subtasks = [
        { title: `Understand ${title}`, completed: false },
        { title: `Review examples for ${title}`, completed: false },
        { title: `Practice ${title} problems`, completed: false },
      ];
    }

    const created = await Task.create({
      user: user._id,
      title,
      description,
      subtasks,
    });

    await Progress.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { user: user._id } },
      { upsert: true }
    );

    return NextResponse.json(created);
  }

  if (body.action === "generate-subtasks" && body.taskId) {
    const task = await Task.findOne({ _id: body.taskId, user: user._id });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    try {
      const mlResp = await mlClient.post("/analyze", {
        text: `${task.title}\n\n${task.description || ""}`,
      });
      const mlData = mlResp.data || {};
      const generated =
        Array.isArray(mlData.subtasks) && mlData.subtasks.length > 0
          ? mlData.subtasks
          : Array.isArray(mlData.keywords)
          ? mlData.keywords.slice(0, 6)
          : [];

      const newSubtasks = (generated as any[]).map((s) =>
        typeof s === "string"
          ? { title: s, completed: false }
          : { title: s.title || String(s), completed: false }
      );
      task.subtasks = [...(task.subtasks || []), ...newSubtasks];
      await task.save();
      return NextResponse.json(task);
    } catch (e) {
      return NextResponse.json(
        { error: "ML service failed", detail: String(e) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, taskId, subtasks, completed } = body;

  const task = await Task.findOne({ _id: taskId, user: user._id });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (action === "toggle-task-done") {
    // ✅ toggle both ways
    const newCompleted = !task.completed;
    task.completed = newCompleted;
    task.subtasks = (task.subtasks || []).map((s) => ({ ...s, completed: newCompleted }));
    await task.save();
    return NextResponse.json(task);
  }

  if (action === "update-task") {
    // ✅ explicit update
    task.completed = completed;
    task.subtasks = (task.subtasks || []).map((s) => ({ ...s, completed }));
    await task.save();
    return NextResponse.json(task);
  }

  if (action === "update-subtasks" && Array.isArray(subtasks)) {
    task.subtasks = subtasks;
    // auto-sync task completion
    task.completed = task.subtasks.every((s: any) => s.completed);
    await task.save();
    return NextResponse.json(task);
  }

  return NextResponse.json({ error: "Unknown patch action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { taskId, subtaskId } = body;

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  const task = await Task.findOne({ _id: taskId, user: user._id });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (subtaskId) {
    // ✅ delete just a subtask
    task.subtasks = task.subtasks.filter((s: any) => s._id.toString() !== subtaskId);
    await task.save();
    return NextResponse.json({ message: "Subtask deleted", task });
  } else {
    // ✅ delete the whole task
    await Task.deleteOne({ _id: taskId, user: user._id });
    return NextResponse.json({ message: "Task deleted" });
  }
}
