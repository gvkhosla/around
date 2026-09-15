import { refreshCodex } from "@/lib/codex";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { refreshToken?: string };
    if (!body.refreshToken) {
      return NextResponse.json({ error: "Missing refresh" }, { status: 400 });
    }
    const tokens = await refreshCodex(body.refreshToken);
    return NextResponse.json(tokens);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
