// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "../../../lib/db/connect";
import User from "../../../lib/models/User";
import { signToken } from "../../../lib/utils/jwt";

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const { action, name, email, password } = body;

  try {
    if (!action || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === "register") {
      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return NextResponse.json({ error: "Email already used" }, { status: 409 });
      }
      const saltRounds = parseInt(process.env.BCRYPT_SALT || "10", 10);
      const hash = await bcrypt.hash(password, saltRounds);
      const u = await User.create({ name, email: normalizedEmail, password: hash });
      const token = signToken({ uid: u._id, email: u.email });
      return NextResponse.json({ token, userId: u._id });
    }

    if (action === "login") {
      const u = await User.findOne({ email: normalizedEmail });
      if (!u) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const ok = await bcrypt.compare(password, u.password);
      if (!ok) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const token = signToken({ uid: u._id, email: u.email });
      return NextResponse.json({ token, userId: u._id });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
