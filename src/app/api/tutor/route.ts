import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "../../../lib/db/connect";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";
import { mlClient } from "../../../lib/utils/mlClient";
import User from "../../../lib/models/User";

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const history = Array.isArray(body.history) ? body.history : [];

  try {
    // 🚀 Send message to ML Tutor microservice
    const resp = await mlClient.post("/tutor", { history, userId: user._id });

    const data = resp.data || {};
    const answer =
      data.reply ?? data.answer ?? data.text ?? JSON.stringify(data);

    // 🧠 Append tutor reply to current conversation
    const updatedHistory = [
      ...history,
      { role: "assistant", content: answer },
    ];

    // 💾 Save to MongoDB
    await User.findByIdAndUpdate(user._id, {
      tutorChatHistory: updatedHistory,
    });

    // ✅ Return response
    return NextResponse.json({ answer });
  } catch (e) {
    if (typeof e === "object" && e !== null) {
      const errorData = (e as any).response?.data;
      const errorMessage = (e as any).message;
      console.error("Tutor proxy failed:", errorData ?? errorMessage ?? e);
    } else {
      console.error("Tutor proxy failed:", e);
    }
    return NextResponse.json(
      { error: "Tutor service error" },
      { status: 500 }
    );
  }
}
