import { NextRequest, NextResponse } from "next/server";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";

export async function GET(req: NextRequest) {
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: user.name || "User",
    email: user.email || "unknown@example.com",
  });
}
