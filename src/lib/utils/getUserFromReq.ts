// src/lib/utils/getUserFromReq.ts
import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";
import User from "../models/User";
import { connectDB } from "../db/connect";

export async function getUserFromReq(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    await connectDB();

    const decoded = verifyToken(token); // ✅ throws if invalid/expired

    const user = await User.findById(decoded.uid).lean();
    return user || null;
  } catch (e) {
    console.error("getUserFromReq error:", e);
    return null;
  }
}
