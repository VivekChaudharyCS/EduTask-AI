import mongoose, { Schema, Document } from "mongoose";

interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface IQuizResult {
  score: number;
  answers: { question: string; selected: string; correct: string }[];
  takenAt: Date;
}

interface ISubtask {
  _id: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
}

export interface ITask extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  completed?: boolean;
  subtasks: ISubtask[];
  quizzes?: IQuizQuestion[];
  quizResults?: IQuizResult[];
}

const SubtaskSchema = new Schema<ISubtask>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
}, { _id: true });

const QuizSchema = new Schema<IQuizQuestion>({
  question: String,
  options: [String],
  correctAnswer: String,
});

const QuizResultSchema = new Schema<IQuizResult>({
  score: Number,
  answers: [
    {
      question: String,
      selected: String,
      correct: String,
    },
  ],
  takenAt: { type: Date, default: Date.now },
});
const TaskSchema = new Schema<ITask>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false },
    subtasks: [SubtaskSchema],
    quizzes: [QuizSchema],
    quizResults: [QuizResultSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
