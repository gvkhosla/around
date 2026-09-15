import { discoverAround } from "@/lib/alphaxiv";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!/^\d{4}\.\d{4,5}$/.test(id)) {
    return NextResponse.json({ error: "Missing arXiv id." }, { status: 400 });
  }

  const key =
    request.headers.get("x-alphaxiv-key")?.trim() ||
    process.env.ALPHAXIV_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Connect alphaXiv to discover beyond the bibliography.", needsKey: true },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json(await discoverAround(id, key));
  } catch (error) {
    const message = error instanceof Error ? error.message : "alphaXiv search failed.";
    const status = /unauthorized|authorization|401|invalid.*key/i.test(message)
      ? 401
      : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
