// src/controllers/progressController.ts
import Task from "@/lib/models/Task";

export async function getProgress(req: any, res: any) {
  try {
    const userId = req.user._id;

    const tasks = await Task.find({ user: userId });

    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let completedTasks = 0;

    tasks.forEach((t) => {
      if (t.completed) completedTasks++;
      if (t.subtasks && t.subtasks.length > 0) {
        totalSubtasks += t.subtasks.length;
        completedSubtasks += t.subtasks.filter((s) => s.completed).length;
      }
    });

    const progress = {
      completedTasks,
      totalTasks: tasks.length,
      completedSubtasks,
      totalSubtasks,
      percentage:
        totalSubtasks > 0
          ? Math.round((completedSubtasks / totalSubtasks) * 100)
          : tasks.length > 0
          ? Math.round((completedTasks / tasks.length) * 100)
          : 0,
    };

    res.json(progress);
  } catch (err) {
    console.error("Progress fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
}
