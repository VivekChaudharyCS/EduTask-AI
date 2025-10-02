// src/lib/models/Resource.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IResource extends Document {
  user?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  title: string;
  url: string;
  type?: string;
  qualityScore?: number;
  relevanceScore?: number;
  createdAt: Date;
}

const ResourceSchema = new Schema<IResource>({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  taskId: { type: Schema.Types.ObjectId, ref: "Task" },
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String },
  qualityScore: { type: Number, default: 0 },
  relevanceScore: { type: Number, default: 0 },
}, { timestamps: true });

export default (mongoose.models.Resource as mongoose.Model<IResource>) || mongoose.model<IResource>("Resource", ResourceSchema);
