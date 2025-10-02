import os
import google.generativeai as genai


def ask_tutor(history):
    # Read environment at call time so .env changes take effect without reload issues
    api_key = os.getenv("GOOGLE_API_KEY", "")
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    # Use Gemini if key present
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            # Convert history to a single prompt with brief system guidance
            parts = ["You are a concise, supportive study tutor. Keep answers focused and clear.\n\n"]
            for msg in history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                prefix = "User:" if role == "user" else "Assistant:"
                parts.append(f"{prefix} {content}\n")
            parts.append("Assistant:")
            prompt = "".join(parts)

            res = model.generate_content(prompt)
            return res.text.strip() if getattr(res, "text", None) else "Sorry, I couldn't generate a reply."
        except Exception as e:
            print("Gemini call failed:", e)

    # final fallback: simple local answer
    if history:
        last = history[-1].get("content", "")
        return f"[Tutor fallback] I saw: {last}. Try reviewing examples and running small tests."
    return "Hello! Ask me something about your task."
