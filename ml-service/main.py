import traceback
try:
    ... # your code
    # ml-service/main.py (ensure these imports exist)
    from fastapi import FastAPI
    from starlette.middleware.cors import CORSMiddleware
    # from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    from dotenv import load_dotenv
    from pathlib import Path
    from nlp_processor import analyze_task
    from tutor_service import ask_tutor
    from recommendation_service import recommend_resources
    from progress_service import generate_roadmap
    from gemini_subtasks import generate_subtasks_with_gemini
    from gemini_quiz import generate_quiz_with_gemini
    from gemini_roadmap import generate_roadmap

    # Load .env from this directory explicitly so --app-dir doesn't break env loading
    load_dotenv(dotenv_path=Path(__file__).with_name('.env'))

    class TextIn(BaseModel):
        text: str

    class TutorIn(BaseModel):
        history: list

    class RecommendIn(BaseModel):
        query: str

    class RoadmapIn(BaseModel):
        prompt: str
    
    class SubtaskIn(BaseModel):
        title: str
        description: str

    class RoadmapIn(BaseModel):
        prompt: str

    class QuizIn(BaseModel):
        topic: str
        description: str = ""



    app = FastAPI()

    # CORS for local development (frontend on 3000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        return {"status": "EduTask AI ML Service running 🚀"}

    @app.post("/analyze")
    def analyze(data: TextIn):
        return analyze_task(data.text)

    @app.post("/tutor")
    def tutor(data: TutorIn):
        return {"reply": ask_tutor(data.history)}

    @app.post("/recommend")
    def recommend(data: RecommendIn):
        return {"resources": recommend_resources(data.query)}

    @app.post("/roadmap")
    def roadmap(data: RoadmapIn):
        return {"roadmap": generate_roadmap(data.prompt)}
    
    @app.post("/subtasks")
    def subtasks(data: SubtaskIn):
        return {"subtasks": generate_subtasks_with_gemini(data.title, data.description)}
    
    @app.post("/quiz")
    def quiz(data: QuizIn):
        return {"quiz": generate_quiz_with_gemini(data.topic, data.description)}


except Exception as e:
    print("ERROR:", e)
    traceback.print_exc()
    raise e