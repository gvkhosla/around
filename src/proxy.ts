import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ARXIV_ID =
  /\b((?:[0-9]{2}(?:0[1-9]|1[0-2]))\.\d{4,5})(?:v\d+)?\b/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/settings")
  ) {
    return NextResponse.next();
  }

  const raw = decodeURIComponent(pathname.slice(1));
  const match = raw.match(ARXIV_ID);
  if (!match) return NextResponse.next();
  const id = match[1].replace(/v\d+$/i, "");
  return NextResponse.redirect(new URL(`/p/${id}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
