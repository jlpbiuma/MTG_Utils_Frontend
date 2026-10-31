import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/proxy";

export const dynamic = "force-dynamic";

/** Clears a session the backend rejected (401) and goes back to login. */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const response = NextResponse.redirect(url);
  for (const name of [...SESSION_COOKIES, "mtg_session_checked"]) response.cookies.delete(name);
  return response;
}
