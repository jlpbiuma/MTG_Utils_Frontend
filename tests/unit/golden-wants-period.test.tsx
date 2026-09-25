import { describe, it, expect, vi, beforeEach } from "vitest";
import GoldenWantsPage from "@/app/priorities/golden-wants/page";
import { getPriorities } from "@/actions/priorities";

vi.mock("@/actions/priorities", () => ({ getPriorities: vi.fn() }));
vi.mock("@/components/priorities-view", () => ({ PrioritiesView: () => null }));

beforeEach(() => vi.clearAllMocks());

describe("Golden Wants period loading", () => {
  it.each([7, 30, 90, 180, 365])("passes %i days to every page of candidates", async (period) => {
    const response = { items: [], totalUniqueCards: 0, totalDeficitCopies: 0, totalDeficitCost: 0, currencySymbol: "€", provider: "cardmarket" };
    vi.mocked(getPriorities).mockResolvedValueOnce({ ...response, page: 1, hasMore: true })
      .mockResolvedValueOnce({ ...response, page: 2, hasMore: false });
    await GoldenWantsPage({ searchParams: Promise.resolve({ period: String(period) }) });
    expect(getPriorities).toHaveBeenCalledTimes(2);
    for (const [options] of vi.mocked(getPriorities).mock.calls) {
      expect(options).toMatchObject({ priceWindowDays: period, includePriceSignals: true });
    }
  });
});
