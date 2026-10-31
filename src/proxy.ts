import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8000";

/** Session cookies set by actions/auth.ts. */
export const SESSION_COOKIES = ["mtg_token", "mtg_refresh_token", "mtg_user_id", "mtg_user_email"];
/** Marks a token the backend accepted recently, so it is checked at most every 10 minutes. */
const VERIFIED_COOKIE = "mtg_session_checked";
const VERIFY_EVERY_SECONDS = 10 * 60;

/**
 * Whether the backend still accepts the token. Sessions can expire or be
 * revoked (or predate persistent sessions), and every user-scoped API call
 * then fails with 401. `null` when the backend cannot be reached: an outage
 * must not sign anybody out.
 */
async function sessionIsValid(token: string): Promise<boolean | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const me = await res.json();
    return Boolean(me?.isAuthenticated);
  } catch {
    return null;
  }
}

function clearSession(response: NextResponse) {
  for (const name of [...SESSION_COOKIES, VERIFIED_COOKIE]) response.cookies.delete(name);
  return response;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("mtg_token")?.value;
  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  // Every page shows the user's own data; only login is public. DEV_USER_ID
  // (local development against an ALLOW_INSECURE_DEV_AUTH backend) skips it.
  if (!token) {
    if (isAuthRoute || process.env.DEV_USER_ID) return NextResponse.next();
    return redirectTo(request, "/login");
  }

  if (!request.cookies.has(VERIFIED_COOKIE)) {
    const valid = await sessionIsValid(token);
    if (valid === false) {
      return clearSession(isAuthRoute ? NextResponse.next() : redirectTo(request, "/login"));
    }
    if (valid) {
      const response = isAuthRoute ? redirectTo(request, "/decks") : NextResponse.next();
      response.cookies.set(VERIFIED_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: VERIFY_EVERY_SECONDS,
      });
      return response;
    }
  }

  // Already signed in: login goes to the dashboard.
  return isAuthRoute ? redirectTo(request, "/decks") : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
