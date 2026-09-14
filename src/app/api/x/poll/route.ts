import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    hint: "Run `bun run bot` as a process. X mention polling is not a one-shot HTTP job.",
  });
}
