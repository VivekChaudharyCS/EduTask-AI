// src/lib/models/Progress.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IProgress extends Document {
  user: mongoose.Types.ObjectId;
  completedTasks: number;
  quizzesTaken: number;
  avgScore: number;
  roadmap?: string[];
  // optional per-task progress store (if you need)
  createdAt: Date;
  updatedAt: Date;
}

const ProgressSchema = new Schema<IProgress>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  completedTasks: { type: Number, default: 0 },
  quizzesTaken: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  roadmap: { type: [String], default: [] },
}, { timestamps: true });

export default (mongoose.models.Progress as mongoose.Model<IProgress>) || mongoose.model<IProgress>("Progress", ProgressSchema);
