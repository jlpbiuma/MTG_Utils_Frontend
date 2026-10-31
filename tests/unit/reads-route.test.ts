import { describe, expect, it, vi } from "vitest";

const { getCollectionQuery } = vi.hoisted(() => ({ getCollectionQuery: vi.fn() }));
vi.mock("@/lib/read-registry", () => ({ READS: { getCollectionQuery } }));

import { POST } from "@/app/api/reads/[name]/route";
import { GET as expired } from "@/app/api/auth/expired/route";
import { NextRequest } from "next/server";
import { BackendRequestError } from "@/lib/api-client";

const call = (name: string, body: unknown) =>
  POST(new Request(`http://local/api/reads/${name}`, { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ name }),
  });

describe("/api/reads/[name]", () => {
  it("runs an allow-listed read with its JSON arguments", async () => {
    getCollectionQuery.mockResolvedValue({ uniqueCards: 3 });
    const res = await call("getCollectionQuery", { args: [{ page: 2, limit: 120 }] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: { uniqueCards: 3 } });
    expect(getCollectionQuery).toHaveBeenCalledWith({ page: 2, limit: 120 });
  });

  it("refuses names outside the read list, including mutations and prototype keys", async () => {
    for (const name of ["deleteCollectionCard", "constructor", "__proto__"]) {
      expect((await call(name, { args: [] })).status).toBe(404);
    }
  });

  it("reports read failures as 500 without throwing", async () => {
    getCollectionQuery.mockRejectedValue(new Error("backend caído"));
    const res = await call("getCollectionQuery", { args: [] });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "backend caído" });
  });

  it("passes a rejected session through as 401 so the client can sign in again", async () => {
    getCollectionQuery.mockRejectedValue(new BackendRequestError("/api/collection", 401, '{"detail":"x"}'));
    const res = await call("getCollectionQuery", { args: [] });
    expect(res.status).toBe(401);
  });

  it("clears the session cookies and returns to login", () => {
    const res = expired(new NextRequest("https://mtg.test/api/auth/expired?x=1"));
    expect(res.headers.get("location")).toBe("https://mtg.test/login");
    for (const name of ["mtg_token", "mtg_user_id", "mtg_session_checked"]) {
      expect(res.cookies.get(name)?.value).toBe("");
    }
  });
});
