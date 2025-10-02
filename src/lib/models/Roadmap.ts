// src/lib/models/Roadmap.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRoadmap extends Document {
  user: string;
  steps: string[];
}

const RoadmapSchema = new Schema<IRoadmap>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  steps: [String],
});

export default mongoose.models.Roadmap ||
  mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
