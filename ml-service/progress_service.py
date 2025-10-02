# ml-service/progress_service.py
def generate_roadmap(prompt: str):
    # simple roadmap stub
    return "Day 1: review theory\nDay 2: run examples\nDay 3: implement\nDay 4: test\nDay 5: optimize\nDay 6: practice\nDay 7: reflect"
# ml-service/progress_service.py
from typing import List

def generate_roadmap(prompt: str) -> List[str]:
    """
    Generate a simple roadmap breakdown from a given prompt.
    Replace this with real AI/LLM calls (Gemini, OpenAI, etc.)
    """
    if not prompt or len(prompt.strip()) == 0:
        return [
            "Define your learning goals",
            "Break down topics into milestones",
            "Study core resources",
            "Practice exercises",
            "Review and self-assess",
        ]
    
    topic = prompt.split("\n")[0][:50]  # take first line, limit 50 chars
    
    return [
        f"Understand the basics of {topic}",
        f"Study examples and tutorials on {topic}",
        f"Practice hands-on problems for {topic}",
        f"Take a quiz or test your knowledge of {topic}",
        f"Move to advanced concepts in {topic}",
    ]
