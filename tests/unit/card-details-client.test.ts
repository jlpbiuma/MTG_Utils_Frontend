import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { cardDetailsClientCache, getCardDetails } from "@/lib/card-details-client";
import { GET } from "@/app/api/scryfall/card/route";
import { backendFetch } from "@/lib/api-client";
vi.mock("@/lib/api-client", () => ({ backendFetch: vi.fn() }));
const card = { id: "toph", name: "Toph, the First Metalbender", name_es: "Toph, la primera maestra del metal" };
beforeEach(() => { cardDetailsClientCache.clear(); vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("deduplicates concurrent reads and reuses all printings when reopening another edition", async () => {
  let finish!: (value: Response) => void;
  const fetch = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
  vi.stubGlobal("fetch", fetch);
  const first = getCardDetails({ id: "first-print", name: card.name });
  const second = getCardDetails({ id: "second-print", name: card.name });
  expect(fetch).toHaveBeenCalledTimes(1);
  finish(Response.json(card));
  expect(await first).toEqual(card);
  expect(await second).toEqual(card);
  expect(await getCardDetails({ id: "third-print", name: card.name })).toEqual(card);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toContain("/api/scryfall/card?");
});

it("refreshes prices after the cache expires and retries a failed request", async () => {
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(card)).mockResolvedValueOnce(Response.json({ ...card, prices: { eur: "2" } })).mockResolvedValueOnce(new Response(null, { status: 502 })).mockResolvedValueOnce(Response.json(card));
  vi.stubGlobal("fetch", fetch);
  await getCardDetails({ name: card.name });
  now += 120001;
  expect(await getCardDetails({ name: card.name })).toHaveProperty("prices.eur", "2");
  await expect(getCardDetails({ name: "Relámpago" })).rejects.toThrow("No se pudo cargar");
  await expect(getCardDetails({ name: "Relámpago" })).resolves.toEqual(card);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it("forwards one GET to the backend without exposing private errors", async () => {
  vi.mocked(backendFetch).mockResolvedValue(card);
  const request = new Request("http://localhost/api/scryfall/card?name=Toph&ignore=secret");
  const response = await GET(request);
  expect(await response.json()).toEqual(card);
  expect(backendFetch).toHaveBeenCalledExactlyOnceWith("/api/scryfall/card?name=Toph", { signal: request.signal, cache: "no-store" });
  vi.mocked(backendFetch).mockRejectedValue(new Error("private database credentials"));
  const failure = await GET(request);
  expect(failure.status).toBe(502);
  expect(await failure.text()).not.toContain("credentials");
});

it("rejects an empty card request without issuing a query", async () => {
  expect((await GET(new Request("http://localhost/api/scryfall/card"))).status).toBe(400);
  expect(backendFetch).not.toHaveBeenCalled();
});
