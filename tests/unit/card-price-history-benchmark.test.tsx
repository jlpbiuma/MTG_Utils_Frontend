import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import {
  CardDetailDialog,
  priceHistoryClientCache,
  priceHistoryCacheKey,
} from "@/components/card-detail-dialog";
import * as pricingActions from "@/actions/pricing";
import * as scryfallActions from "@/actions/scryfall";
import type { CardPriceHistoryResponse } from "@/lib/pricing/types";

vi.mock("@/actions/pricing", () => ({
  getCardPriceHistory: vi.fn(),
}));

vi.mock("@/actions/scryfall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/scryfall")>();
  return {
    ...actual,
    getCardDetails: vi.fn(),
  };
});

vi.mock("@/actions/decks", () => ({
  updateDeckCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Card Price History Caching & Optimization", () => {
  const sacredFoundryCatalogId = "a7758cc6-4e18-48a5-8720-5f42b5cd9d31";
  const sacredFoundryPrintingId = "0a26d900-c652-4f9c-8681-a35c5f8b1937";

  const mockPriceHistoryResponse: CardPriceHistoryResponse = {
    catalogId: sacredFoundryCatalogId,
    cardName: "Sacred Foundry",
    provider: "cardmarket",
    currency: "EUR",
    days: 30,
    series: [
      {
        printingId: sacredFoundryPrintingId,
        setCode: "gtc",
        collectorNumber: "245",
        setName: "Gatecrash",
        releasedAt: "2013-02-01T00:00:00Z",
        points: [
          {
            provider: "cardmarket",
            currency: "EUR",
            trendPrice: 10.73,
            recordedAt: "2026-09-01T00:00:00Z",
          },
          {
            provider: "cardmarket",
            currency: "EUR",
            trendPrice: 10.8,
            recordedAt: "2026-09-20T00:00:00Z",
          },
        ],
      },
      {
        printingId: "b7b598d0-535d-477d-a33d-d6a10ff5439a",
        setCode: "grn",
        collectorNumber: "254",
        setName: "Guilds of Ravnica",
        releasedAt: "2018-10-05T00:00:00Z",
        points: [
          {
            provider: "cardmarket",
            currency: "EUR",
            trendPrice: 9.25,
            recordedAt: "2026-09-20T00:00:00Z",
          },
        ],
      },
    ],
    expansions: [
      {
        setCode: "gtc",
        setName: "Gatecrash",
        releasedAt: "2013-02-01T00:00:00Z",
        printingId: sacredFoundryPrintingId,
        collectorNumber: "245",
        trendPrice: 10.73,
      },
    ],
  };

  const mockCardDetails: scryfallActions.SpanishCardDetails = {
    id: sacredFoundryCatalogId,
    name: "Sacred Foundry",
    name_es: "Fundición sagrada",
    mana_cost: "",
    cmc: 0,
    type_line: "Land — Mountain Plains",
    type_line_es: "Tierra — Montaña Llanura",
    oracle_text: "({T}: Add {R} or {W}.)",
    oracle_text_es: "({T}: Agrega {R} o {W}.)",
    rarity: "rare",
    rarity_es: "Rara",
    set: "GTC",
    set_name: "Gatecrash",
    collector_number: "245",
    has_spanish_print: true,
    image_uris: { normal: "http://example.com/sf.jpg" },
    printings: [
      {
        id: sacredFoundryPrintingId,
        set_code: "gtc",
        set_name: "Gatecrash",
        collector_number: "245",
        rarity: "rare",
        image_uri: "http://example.com/sf-gtc.jpg",
        trend: 10.73,
      },
      {
        id: "b7b598d0-535d-477d-a33d-d6a10ff5439a",
        set_code: "grn",
        set_name: "Guilds of Ravnica",
        collector_number: "254",
        rarity: "rare",
        image_uri: "http://example.com/sf-grn.jpg",
        trend: 9.25,
      },
    ],
    card_faces: [],
    legalities: [],
    prices: { eur: "10.73" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    priceHistoryClientCache.clear();
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(mockCardDetails);
    vi.mocked(pricingActions.getCardPriceHistory).mockResolvedValue(mockPriceHistoryResponse);
  });

  it("should fetch price history on initial open and cache the result", async () => {
    render(
      <CardDetailDialog
        isOpen={true}
        cardId={sacredFoundryCatalogId}
        cardName="Sacred Foundry"
        defaultTab="prices"
      />
    );

    // Initial fetch must be called
    await waitFor(() => {
      expect(pricingActions.getCardPriceHistory).toHaveBeenCalledTimes(1);
    });
    expect(pricingActions.getCardPriceHistory).toHaveBeenCalledWith(
      sacredFoundryCatalogId,
      "cardmarket",
      30
    );

    // Check that client cache is populated with catalog ID and printing IDs for the window
    expect(priceHistoryClientCache.has(priceHistoryCacheKey(sacredFoundryCatalogId, 30))).toBe(true);
    expect(priceHistoryClientCache.has(priceHistoryCacheKey(sacredFoundryPrintingId, 30))).toBe(true);
  });

  it("should not re-fetch price history when cached in client memory (0 network calls on re-opening)", async () => {
    // Pre-populate cache
    priceHistoryClientCache.set(
      priceHistoryCacheKey(sacredFoundryCatalogId, 30),
      mockPriceHistoryResponse
    );

    render(
      <CardDetailDialog
        isOpen={true}
        cardId={sacredFoundryCatalogId}
        cardName="Sacred Foundry"
        defaultTab="prices"
      />
    );

    // Should NOT call getCardPriceHistory because it was found in cache
    await waitFor(() => {
      expect(screen.getByText("GTC · #245")).toBeDefined();
    });

    expect(pricingActions.getCardPriceHistory).toHaveBeenCalledTimes(0);
  });

  it("should populate cache for all printings so switching printing does not trigger network requests", async () => {
    const { rerender } = render(
      <CardDetailDialog
        isOpen={true}
        cardId={sacredFoundryCatalogId}
        cardName="Sacred Foundry"
        defaultTab="prices"
      />
    );

    await waitFor(() => {
      expect(pricingActions.getCardPriceHistory).toHaveBeenCalledTimes(1);
    });

    // Rerender with a specific printingId of the same card (e.g. user selected another version)
    rerender(
      <CardDetailDialog
        isOpen={true}
        cardId={sacredFoundryPrintingId}
        cardName="Sacred Foundry"
        defaultTab="prices"
      />
    );

    // Call count must remain 1 — no extra network calls!
    expect(pricingActions.getCardPriceHistory).toHaveBeenCalledTimes(1);
  });

  it("should refetch when the user selects a different history window", async () => {
    const longWindow: CardPriceHistoryResponse = {
      ...mockPriceHistoryResponse,
      days: 365,
    };
    vi.mocked(pricingActions.getCardPriceHistory).mockImplementation(
      async (_id, _provider, days = 30) =>
        days === 365 ? longWindow : mockPriceHistoryResponse
    );

    render(
      <CardDetailDialog
        isOpen={true}
        cardId={sacredFoundryCatalogId}
        cardName="Sacred Foundry"
        defaultTab="prices"
      />
    );

    await waitFor(() => {
      expect(pricingActions.getCardPriceHistory).toHaveBeenCalledWith(
        sacredFoundryCatalogId,
        "cardmarket",
        30
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "1A" }));

    await waitFor(() => {
      expect(pricingActions.getCardPriceHistory).toHaveBeenCalledWith(
        sacredFoundryCatalogId,
        "cardmarket",
        365
      );
    });
    expect(priceHistoryClientCache.has(priceHistoryCacheKey(sacredFoundryCatalogId, 365))).toBe(
      true
    );
  });
});
