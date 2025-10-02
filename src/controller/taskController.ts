// src/controllers/taskController.ts
import Task from "@/lib/models/Task";
import { generateSubtasks } from "@/lib/services/subtaskService";

export async function createTask(req: any, res: any) {
  try {
    const { title, description } = req.body;

    // Generate subtasks
    const subtasks = await generateSubtasks(title, description);

    const task = await Task.create({
      title,
      description,
      subtasks: subtasks.map((s: string) => ({ title: s, completed: false })),
    });

    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
}

export async function toggleSubtask(req: any, res: any) {
  try {
    const { taskId, subtaskIndex } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    task.subtasks[subtaskIndex].completed =
      !task.subtasks[subtaskIndex].completed;

    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subtask" });
  }
}
