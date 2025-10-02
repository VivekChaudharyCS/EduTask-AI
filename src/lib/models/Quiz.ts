import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // correct answer
}

export interface IAttempt {
  date: Date;
  score: number;
}

export interface IQuiz extends Document {
  user: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  questions: IQuestion[];
  score?: number;
  lastAttempt?: Date;
  attempts?: IAttempt[];
}

const QuestionSchema = new Schema<IQuestion>({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
});

const AttemptSchema = new Schema<IAttempt>({
  date: { type: Date, default: Date.now },
  score: { type: Number, required: true },
});

const QuizSchema = new Schema<IQuiz>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    questions: [QuestionSchema],
    score: { type: Number, default: 0 },
    lastAttempt: { type: Date },
    attempts: [AttemptSchema], // ✅ keep history
  },
  { timestamps: true }
);

export default mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);
