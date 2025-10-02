# ml-service/roadmap_service.py
import os
import google.generativeai as genai

def generate_roadmap(prompt: str):
    api_key = os.getenv("GOOGLE_API_KEY", "")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not set in environment")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    try:
        res = model.generate_content(
            f"Generate a clear step-by-step learning roadmap based on this input:\n{prompt}\n\n"
            f"Return as a plain numbered list of steps."
        )
        text = res.text.strip()
        steps = [line.split(". ", 1)[-1] if ". " in line else line for line in text.split("\n") if line.strip()]
        return {"roadmap": steps}
    except Exception as e:
        print("Gemini roadmap generation failed:", e)
        return {
            "roadmap": [
                "Understand fundamentals",
                "Review tutorials",
                "Practice coding problems",
                "Take quizzes",
                "Advance to next level",
            ]
        }
