import { getBrief, resolvePaperId } from "@/lib/brief";
import { NextResponse } from "next/server";

export const maxDuration = 60;

function publicUrl(id: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  return base ? `${base.replace(/\/$/, "")}/p/${id}` : `/p/${id}`;
}

async function handle(q: string) {
  const query = q.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }
  const id = await resolvePaperId(query);
  if (!id) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }
  const brief = await getBrief(id);
  return NextResponse.json({
    id: brief.id,
    title: brief.title,
    url: publicUrl(brief.id),
    claim: brief.claim,
  });
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    return await handle(q);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { q?: string };
    return await handle(body.q || "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
