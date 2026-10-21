import { beforeEach, expect, it, vi } from "vitest";
import { applySimulatedPrinting } from "@/actions/simulated-collections";
import { BackendRequestError, backendFetch } from "@/lib/api-client";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/actions/auth", () => ({ getCurrentUserId: vi.fn().mockResolvedValue("owner") }));
vi.mock("@/lib/api-client", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api-client")>(), backendFetch: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it("changes a temporary Spanish offer's printing through a serializable action result", async () => {
  vi.mocked(backendFetch).mockResolvedValue(fixture);
  const result = await applySimulatedPrinting({ rawText: "1 Toph, la primera maestra del metal", cardName: "Toph, the First Metalbender", printingId: "toph-353" });
  expect(result).toEqual({ ok: true, data: fixture });
  expect(backendFetch).toHaveBeenCalledWith("/api/simulated-collections/analyze-raw", expect.objectContaining({ body: JSON.stringify({ rawText: "1 Toph, la primera maestra del metal", provider: "cardmarket", printingOverrides: { "toph, the first metalbender": "toph-353" } }) }));
});
it("returns the backend validation message without throwing a production React error", async () => {
  vi.mocked(backendFetch).mockRejectedValue(new BackendRequestError("/api/private", 422, JSON.stringify({ detail: "La versión no pertenece a esta carta o no está en el catálogo local." })));
  await expect(applySimulatedPrinting({ collectionId: "offer", rawText: "", cardName: "Toph, the First Metalbender", printingId: "art" })).resolves.toEqual({ ok: false, error: "La versión no pertenece a esta carta o no está en el catálogo local." });
});
it("does not expose internal server errors", async () => {
  vi.mocked(backendFetch).mockRejectedValue(new BackendRequestError("/api/private", 500, "database internal details"));
  const result = await applySimulatedPrinting({ rawText: "1 Toph", cardName: "Toph", printingId: "id" });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("database internal");
});
