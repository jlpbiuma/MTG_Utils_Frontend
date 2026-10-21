import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("authentication proxy", () => {
  it.each(["/decks", "/decks/123", "/collection", "/collection/simulated"])(
    "redirects unauthenticated requests for %s to login and preserves the query",
    async (pathname) => {
      const response = await proxy(new NextRequest(`https://mtg.test${pathname}?view=grid`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://mtg.test/login?view=grid");
    }
  );

  it.each(["mtg_token", "mtg_user_id"])(
    "allows protected routes and redirects login when %s is present",
    async (cookie) => {
      const headers = { cookie: `${cookie}=session-value` };
      const allowed = await proxy(new NextRequest("https://mtg.test/decks", { headers }));
      expect(allowed.headers.get("x-middleware-next")).toBe("1");
      const login = await proxy(new NextRequest("https://mtg.test/login", { headers }));
      expect(login.headers.get("location")).toBe("https://mtg.test/decks");
    }
  );

  it.each(["/login", "/prices", "/buy/offers"])(
    "allows public route %s without a session",
    async (pathname) => {
      const response = await proxy(new NextRequest(`https://mtg.test${pathname}`));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  );
});
