// src/lib/utils/auth.ts
import { verifyToken } from "./jwt";
import User from "@/lib/models/User";
import { NextRequest } from "next/server";

export async function getUserFromReq(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth || !auth.startsWith("Bearer ")) return null;
    const token = auth.replace("Bearer ", "").trim();
    const payload = verifyToken(token);
    if (!payload?.uid) return null;
    const user = await User.findById(payload.uid).select("-password").lean();
    return user || null;
  } catch {
    return null;
  }
}
