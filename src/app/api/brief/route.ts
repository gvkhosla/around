import { authFromRequest } from "@/lib/auth";
import { loadBrief, resolvePaperId } from "@/lib/brief";
import { NextResponse } from "next/server";

export const maxDuration = 60;

function publicUrl(id: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "");
  return base ? `${base.replace(/\/$/, "")}/p/${id}` : `/p/${id}`;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") || "";
  return run(q, authFromRequest(request), false);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { q?: string; refresh?: boolean };
    return run(body.q || "", authFromRequest(request), Boolean(body.refresh));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function run(q: string, auth: ReturnType<typeof authFromRequest>, refresh: boolean) {
  const query = q.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }
  try {
    const id = await resolvePaperId(query);
    if (!id) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }
    const brief = await loadBrief(id, auth, refresh);
    return NextResponse.json({
      id: brief.id,
      title: brief.title,
      url: publicUrl(brief.id),
      claim: brief.claim,
      usedLlm: brief.usedLlm,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
