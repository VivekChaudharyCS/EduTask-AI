# ml-service/nlp_processor.py
from gemini_subtasks import generate_subtasks_with_gemini

def analyze_task(text: str):
    # Extract title and description (basic split)
    lines = text.split("\n", 1)
    title = lines[0] if lines else "Learning Task"
    description = lines[1] if len(lines) > 1 else ""

    try:
        subtasks = generate_subtasks_with_gemini(title, description)
        return {"subtasks": subtasks}
    except Exception as e:
        print("Gemini analyze_task failed:", e)
        return {"subtasks": []}