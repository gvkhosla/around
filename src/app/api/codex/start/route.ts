import { startCodexDevice } from "@/lib/codex";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const device = await startCodexDevice();
    return NextResponse.json(device);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
