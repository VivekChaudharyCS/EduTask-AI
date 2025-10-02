import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "../../../lib/utils/apiClient";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  try {
    const { data } = await mlClient.post("/analyze", { text });
    return NextResponse.json({ success: true, result: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
