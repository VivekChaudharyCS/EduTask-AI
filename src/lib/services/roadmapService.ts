// src/lib/services/roadmapService.ts
import axios from "axios";

export async function generateRoadmap(progress: any) {
  const prompt = `
The student has the following progress:
- ${progress.completedTasks}/${progress.totalTasks} tasks completed
- ${progress.completedSubtasks}/${progress.totalSubtasks} subtasks completed
- Current progress: ${progress.percentage}%

Suggest the next 3 learning steps in a clear, actionable roadmap.
Keep it short and motivating.
Return as a JSON array of strings.
`;

  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { params: { key: process.env.GEMINI_API_KEY } }
    );

    const raw =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    return JSON.parse(raw);
  } catch (err) {
    console.error("Roadmap generation failed:", err);
    return [
      "Revise concepts from completed tasks.",
      "Attempt practice quiz on current topic.",
      "Start next pending task with focus on subtasks.",
    ];
  }
}
