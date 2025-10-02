import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connect";
import Task from "../../../../lib/models/Task";
import { getUserFromReq } from "../../../../lib/utils/getUserFromReq";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskid: string } }
) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const task = await Task.findOne({ _id: params.taskid, user: user._id }).lean();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (err) {
    console.error("Task fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}
