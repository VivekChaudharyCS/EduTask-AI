// src/app/api/recommendation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { mlClient } from "../../../lib/utils/mlClient";
import { getUserFromReq } from "../../../lib/utils/getUserFromReq";
import { connectDB } from "../../../lib/db/connect";

export async function POST(req: NextRequest) {
  await connectDB();
  const user = await getUserFromReq(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { query } = body;
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'query' field" }, { status: 400 });
  }

  try {
    // Call ML service (or your recommendation endpoint)
  const resp = await mlClient.post("/recommend", { query });
  return NextResponse.json(resp.data.resources);
  } catch (e) {
    if (typeof e === "object" && e !== null) {
      const errorData = (e as any).response?.data;
      const errorMessage = (e as any).message;
      console.error("Recommendation proxy failed:", errorData ?? errorMessage ?? e);
    } else {
      console.error("Recommendation proxy failed:", e);
    }
    // fallback small sample
    return NextResponse.json([
      {
        type: "web",
        title: "Sample: Read algorithm article",
        url: "https://example.com/article",
      },
    ]);
  }
}
