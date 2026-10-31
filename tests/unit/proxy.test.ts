import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function mockMe(response: unknown) {
  const fetchMock = vi.fn(async () =>
    response instanceof Error ? Promise.reject(response) : new Response(JSON.stringify(response), { status: 200 })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("authentication proxy", () => {
  it.each(["/decks", "/decks/123", "/collection", "/collection/simulated", "/buy/offers", "/wants", "/prices"])(
    "redirects unauthenticated requests for %s to login and preserves the query",
    async (pathname) => {
      const response = await proxy(new NextRequest(`https://mtg.test${pathname}?view=grid`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://mtg.test/login?view=grid");
    }
  );

  it("does not treat a user id cookie alone as a session", async () => {
    const response = await proxy(new NextRequest("https://mtg.test/decks", { headers: { cookie: "mtg_user_id=someone" } }));
    expect(response.headers.get("location")).toBe("https://mtg.test/login");
  });

  it("allows login without a session", async () => {
    const response = await proxy(new NextRequest("https://mtg.test/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("verifies a session once, remembers it and redirects login to decks", async () => {
    const fetchMock = mockMe({ id: "u1", isAuthenticated: true });
    const allowed = await proxy(new NextRequest("https://mtg.test/decks", { headers: { cookie: "mtg_token=t" } }));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
    expect(allowed.cookies.get("mtg_session_checked")?.value).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const headers = { cookie: "mtg_token=t; mtg_session_checked=1" };
    await proxy(new NextRequest("https://mtg.test/collection", { headers }));
    const login = await proxy(new NextRequest("https://mtg.test/login", { headers }));
    expect(login.headers.get("location")).toBe("https://mtg.test/decks");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears a session the backend rejects and sends the user to login", async () => {
    mockMe({ id: "demo", isAuthenticated: false });
    const response = await proxy(new NextRequest("https://mtg.test/decks", { headers: { cookie: "mtg_token=old" } }));
    expect(response.headers.get("location")).toBe("https://mtg.test/login");
    expect(response.cookies.get("mtg_token")?.value).toBe("");

    const login = await proxy(new NextRequest("https://mtg.test/login", { headers: { cookie: "mtg_token=old" } }));
    expect(login.headers.get("x-middleware-next")).toBe("1");
    expect(login.cookies.get("mtg_token")?.value).toBe("");
  });

  it("keeps the user signed in when the backend cannot be reached", async () => {
    mockMe(new Error("ECONNREFUSED"));
    const response = await proxy(new NextRequest("https://mtg.test/decks", { headers: { cookie: "mtg_token=t" } }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.cookies.get("mtg_session_checked")).toBeUndefined();
  });

  it("lets local development through with DEV_USER_ID", async () => {
    vi.stubEnv("DEV_USER_ID", "u1");
    const response = await proxy(new NextRequest("https://mtg.test/decks"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
