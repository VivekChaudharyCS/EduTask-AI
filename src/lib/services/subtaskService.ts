// src/lib/services/subtaskService.ts
import axios from "axios";

export async function generateSubtasks(taskTitle: string, description: string) {
  const prompt = `Break down the following academic task into 4-6 clear, actionable subtasks:

Task: ${taskTitle}
Description: ${description}

Respond as a JSON array of strings.`;

  try {
    // Example with Gemini API (replace with your actual call)
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { params: { key: process.env.GEMINI_API_KEY } }
    );

    // Extract model output
    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    return JSON.parse(raw);
  } catch (err) {
    console.error("Subtask generation failed:", err);
    return ["Understand requirements", "Study references", "Draft outline"];
  }
}
