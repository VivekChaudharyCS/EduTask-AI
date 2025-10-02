// src/app/api/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connect";
import Task from "../../../lib/models/Task";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";

export async function GET(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await Task.find({ user: user._id }).lean();

  let totalSubtasks = 0;
  let completedSubtasks = 0;
  let completedTasks = 0;

  tasks.forEach((t: any) => {
    if (t.completed) completedTasks++;
    if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
      totalSubtasks += t.subtasks.length;
      completedSubtasks += t.subtasks.filter((s: any) => s.completed).length;
    }
  });

  // Weighted progress: average of task and subtask completion
  let percentage = 0;
  if (tasks.length > 0 && totalSubtasks > 0) {
    const taskPercent = completedTasks / tasks.length;
    const subtaskPercent = completedSubtasks / totalSubtasks;
    percentage = Math.round(((taskPercent + subtaskPercent) / 2) * 100);
  } else if (tasks.length > 0) {
    percentage = Math.round((completedTasks / tasks.length) * 100);
  } else if (totalSubtasks > 0) {
    percentage = Math.round((completedSubtasks / totalSubtasks) * 100);
  }
  const progress = {
    completedTasks,
    totalTasks: tasks.length,
    completedSubtasks,
    totalSubtasks,
    percentage,
  };

  return NextResponse.json(progress);
}
