# ml-service/gemini_subtasks.py
import os
import google.generativeai as genai
import json
import re

def parse_subtasks_fallback(text: str):
    lines = text.splitlines()
    subtasks = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^(?:\d+[\.\)]\s*|-|\*)\s*(.+)", line)
        if match:
            subtasks.append(match.group(1).strip())
        else:
            subtasks.append(line)
    return subtasks

def generate_subtasks_with_gemini(task_title: str, task_description: str):
    api_key = os.getenv("GOOGLE_API_KEY", "")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set in environment")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    prompt = f"""
    Generate 3-5 actionable subtasks for this learning task.

    Task: {task_title}
    Description: {task_description}

    Return the answer strictly as a JSON array of strings.
    Example:
    ["Learn basics of C", "Review examples", "Practice problems"]
    """

    try:
        res = model.generate_content(prompt)
        text = res.text.strip()

        # ✅ Strip Markdown fences if Gemini added them
        if text.startswith("```"):
            text = text.strip("`")            # remove ```
            if text.lower().startswith("json"):
                text = text[4:].strip()       # remove 'json'

        # ✅ Parse JSON
        if text.startswith("["):
            return json.loads(text)

        # ✅ Fallback regex
        return parse_subtasks_fallback(text)

    except Exception as e:
        print("Gemini subtasks generation failed:", e)
        return [
            f"Understand {task_title}",
            f"Review examples for {task_title}",
            f"Practice {task_title} problems"
        ]
