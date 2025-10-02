import os
import requests
import json
import re

def generate_quiz_with_gemini(topic: str, description: str = ""):
    """
    Calls Gemini API to generate a quiz (5 multiple-choice questions).
    Returns a list of quiz dicts with keys: question, options, correctAnswer.
    """
    GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
    if not GEMINI_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY not set in environment")

    prompt = f"""
    Generate exactly 5 multiple-choice quiz questions on the topic: {topic}.
    Context: {description}

    Requirements:
    - Each question must have 4 options
    - Include the correct answer (must exactly match one of the options)
    - Return ONLY valid JSON, no markdown, no extra text

    Example:
    [
      {{
        "question": "What is 2 + 2?",
        "options": ["1", "2", "3", "4"],
        "correctAnswer": "4"
      }}
    ]
    """

    url = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
    print(">>> Using Gemini model URL:", url)
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 2048},
    }
    params = {"key": GEMINI_API_KEY}

    resp = requests.post(url, headers=headers, params=params, json=data, timeout=20)
    resp.raise_for_status()
    result = resp.json()

    try:
        text = result["candidates"][0]["content"]["parts"][0]["text"].strip()

        # ✅ Remove markdown code fences like ```json ... ```
        clean = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()

        quiz = json.loads(clean)
        return quiz
    except Exception as e:
        print("Quiz parsing failed:", e, "Raw response:", result)

        # ✅ Safe fallback quiz
        return [
            {
                "question": "What is the entry point of every C program?",
                "options": ["init()", "start()", "main()", "execute()"],
                "correctAnswer": "main()",
            },
            {
                "question": "Which data structure uses FIFO (First In, First Out)?",
                "options": ["Stack", "Queue", "Tree", "Graph"],
                "correctAnswer": "Queue",
            },
        ]
