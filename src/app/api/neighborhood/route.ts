import { getNeighborhood } from "@/lib/brief";
import { NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const data = await getNeighborhood(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { builtOn: [], similar: [], then: [] },
      { status: 200 },
    );
  }
}
