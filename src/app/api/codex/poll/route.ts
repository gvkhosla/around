import { pollCodexDevice } from "@/lib/codex";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      deviceAuthId?: string;
      userCode?: string;
    };
    if (!body.deviceAuthId || !body.userCode) {
      return NextResponse.json({ error: "Missing device" }, { status: 400 });
    }
    const result = await pollCodexDevice({
      deviceAuthId: body.deviceAuthId,
      userCode: body.userCode,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
