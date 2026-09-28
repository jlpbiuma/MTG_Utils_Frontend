import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/scryfall/search/route";
import { backendFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ backendFetch: vi.fn() }));
beforeEach(() => { vi.mocked(backendFetch).mockReset(); });

it("forwards the encoded name and cancellation signal to the backend", async () => {
  const result = { data: [{ id: "one", name: "Sol Ring" }], has_more: false, total_cards: 1 };
  vi.mocked(backendFetch).mockResolvedValue(result);
  const request = new Request("http://localhost/api/scryfall/search?q=Sol%20Ring");
  const response = await GET(request);
  expect(backendFetch).toHaveBeenCalledWith(
    "/api/scryfall/search?q=Sol%20Ring&page=1&prefer_local=true",
    { signal: request.signal },
  );
  expect(await response.json()).toEqual(result);
});

it("does not query the backend for a short query", async () => {
  const response = await GET(new Request("http://localhost/api/scryfall/search?q=s"));
  expect(backendFetch).not.toHaveBeenCalled();
  expect(await response.json()).toEqual({ data: [], total_cards: 0, has_more: false });
});

it("returns a failure status when the backend fails", async () => {
  vi.mocked(backendFetch).mockRejectedValue(new Error("unavailable"));
  const response = await GET(new Request("http://localhost/api/scryfall/search?q=Sol"));
  expect(response.status).toBe(502);
});
