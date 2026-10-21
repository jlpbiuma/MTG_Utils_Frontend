import { beforeEach, expect, it, vi } from "vitest";
import { backendFetch, BackendRequestError } from "@/lib/api-client";
import {
  commitPurchase,
  prepareHistoricalPurchase,
  prepareOfferPurchase,
} from "@/actions/acquisitions";
import { revalidatePath } from "next/cache";
vi.mock("@/lib/api-client", async (original) => ({
  ...(await original<typeof import("@/lib/api-client")>()),
  backendFetch: vi.fn(),
}));
vi.mock("@/actions/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("alice"),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
it("sends quotes through the authenticated backend and revalidates inventory, expenses and deck notices only on success", async () => {
  vi.mocked(backendFetch).mockResolvedValue({
    batchId: "b",
    alreadyConfirmed: false,
  });
  expect(await commitPurchase("q", true)).toEqual({
    ok: true,
    data: { batchId: "b", alreadyConfirmed: false },
  });
  expect(backendFetch).toHaveBeenCalledWith(
    "/api/acquisitions/confirm",
    expect.objectContaining({
      userId: "alice",
      method: "POST",
      body: JSON.stringify({ quoteId: "q", acknowledgeBudget: true }),
    }),
  );
  expect(revalidatePath).toHaveBeenCalledWith("/buy/expenses");
  expect(revalidatePath).toHaveBeenCalledWith("/decks");
});
it("returns a budget conflict for explicit acceptance without invalidating successful views", async () => {
  const budget = { spent: 601, excess: 1, requiresAcknowledgement: true };
  vi.mocked(backendFetch).mockRejectedValue(
    new BackendRequestError(
      "/confirm",
      409,
      JSON.stringify({
        detail: {
          message: "Revisa el presupuesto",
          code: "budget_acknowledgement_required",
          budget,
        },
      }),
    ),
  );
  expect(await commitPurchase("q")).toEqual({
    ok: false,
    error: "Revisa el presupuesto",
    code: "budget_acknowledgement_required",
    budget,
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it("does not expose server internals when historical quote creation fails", async () => {
  vi.mocked(backendFetch).mockRejectedValue(
    new BackendRequestError(
      "/quote",
      500,
      JSON.stringify({ detail: "database credentials private" }),
    ),
  );
  const result = await prepareHistoricalPurchase({
    name: "Precon",
    rawText: "1 Sol Ring",
    total: "40",
    acquiredOn: "2025-01-01",
    kind: "precon",
    origin: "other",
    seller: null,
    sourceUrl: null,
    selections: [{ line: 1, collectionCardId: "c", quantity: 1 }],
  });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain("credentials");
});

it.each([false, true])(
  "refreshes wants and needs after an offer commit, including replay=%s",
  async (alreadyConfirmed) => {
    vi.mocked(backendFetch).mockResolvedValue({
      batchId: "offer-batch",
      alreadyConfirmed,
    });
    const result = await commitPurchase("offer-quote");
    expect(result).toEqual({
      ok: true,
      data: { batchId: "offer-batch", alreadyConfirmed },
    });
    // /wants redirects here: the actual wish-list page must be invalidated.
    expect(revalidatePath).toHaveBeenCalledWith("/buy/list");
    expect(revalidatePath).toHaveBeenCalledWith("/buy/needs");
    expect(revalidatePath).toHaveBeenCalledWith("/buy/offers");
    expect(revalidatePath).toHaveBeenCalledWith("/collection/inventory");
  },
);

it("reviewing an offer does not invalidate desires before inventory is committed", async () => {
  vi.mocked(backendFetch).mockResolvedValue({ quoteId: "offer-quote" });
  await prepareOfferPurchase("offer", {
    acquiredOn: "2026-01-01",
    cardNames: ["Sol Ring"],
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});

it("a failed offer commit keeps the wish-list and collection caches unchanged", async () => {
  vi.mocked(backendFetch).mockRejectedValue(
    new BackendRequestError(
      "/confirm",
      409,
      JSON.stringify({ detail: "La oferta ha cambiado" }),
    ),
  );
  expect((await commitPurchase("offer-quote")).ok).toBe(false);
  expect(revalidatePath).not.toHaveBeenCalled();
});
