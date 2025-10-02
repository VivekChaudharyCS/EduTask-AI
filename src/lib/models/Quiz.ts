import mongoose, { Schema, Document } from "mongoose";

export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // correct answer
}

export interface IAnswerDetail {
  question: string;
  submitted: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export interface IAttempt {
  date: Date;
  score: number;
  answers: IAnswerDetail[]; // ✅ detailed per-question tracking
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

const AnswerDetailSchema = new Schema<IAnswerDetail>({
  question: { type: String, required: true },
  submitted: { type: String, required: true },
  correctAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
});

const AttemptSchema = new Schema<IAttempt>({
  date: { type: Date, default: Date.now },
  score: { type: Number, required: true },
  answers: [AnswerDetailSchema], // ✅ now stores full answers
});

const QuizSchema = new Schema<IQuiz>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    questions: [QuestionSchema],
    score: { type: Number, default: 0 },
    lastAttempt: { type: Date },
    attempts: [AttemptSchema], // ✅ keep history with answers
  },
  { timestamps: true }
);

export default mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);
