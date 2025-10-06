import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db/connect";
import { getUserFromReq } from "../../../../lib/utils/getUserFromReq";
import User from "../../../../lib/models/User";

/**
 * Handles GET and POST requests for user chat history with the AI Tutor.
 * Fully safe against missing fields or new users.
 */

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromReq(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch the user's chat history safely
    const fullUser = await User.findById(user._id).select("tutorChatHistory");
    const chatHistory = Array.isArray(fullUser?.tutorChatHistory)
      ? fullUser.tutorChatHistory
      : [];

    console.log("📦 Loaded chat history for user:", user._id, chatHistory.length);

    return NextResponse.json(chatHistory);
  } catch (err) {
    console.error("❌ Tutor History GET error:", err);
    return NextResponse.json({ error: "Failed to load chat history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const user = await getUserFromReq(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    // ✅ Sanitize and format messages
    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").trim(),
    }));

    // console.log("🟣 Formatted messages to save:", formattedMessages);

    // ✅ Save chat history safely (creates field if missing)
    await User.findByIdAndUpdate(
      user._id,
      { $set: { tutorChatHistory: formattedMessages } },
      { new: true }
    );

    console.log("✅ Saved tutorChatHistory for user:", user._id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Tutor History POST error:", err);
    return NextResponse.json({ error: "Failed to save chat history" }, { status: 500 });
  }
}
