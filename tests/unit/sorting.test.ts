import { describe, it, expect } from "vitest";
import { sortCards, extractCmc, matchesPriceFilter, SortableCard } from "@/lib/sorting";
import { PriceSummary } from "@/lib/pricing";

describe("Card Sorting Engine", () => {
  it("should extract CMC correctly from mana cost strings", () => {
    expect(extractCmc("{2}{U}{B}")).toBe(4);
    expect(extractCmc("{W}")).toBe(1);
    expect(extractCmc("{X}{R}")).toBe(1);
    expect(extractCmc("{7}")).toBe(7);
    expect(extractCmc(null)).toBe(0);
    expect(extractCmc("")).toBe(0);
  });

  const sampleCards: SortableCard[] = [
    {
      cardName: "Sol Ring",
      cardScryfallId: "id-sol-ring",
      quantity: 1,
      manaCost: "{1}",
      typeLine: "Artifact",
      assignedQuantity: 1,
      ownedInCollection: 1,
      missingCount: 0,
    },
    {
      cardName: "Lightning Bolt",
      cardScryfallId: "id-bolt",
      quantity: 4,
      manaCost: "{R}",
      typeLine: "Instant",
      assignedQuantity: 0,
      ownedInCollection: 2,
      missingCount: 2,
    },
    {
      cardName: "Black Lotus",
      cardScryfallId: "id-lotus",
      quantity: 1,
      manaCost: "{0}",
      typeLine: "Artifact",
      assignedQuantity: 0,
      ownedInCollection: 0,
      missingCount: 1,
    },
    {
      cardName: "Counterspell",
      cardScryfallId: "id-counterspell",
      quantity: 2,
      manaCost: "{U}{U}",
      typeLine: "Instant",
      assignedQuantity: 0,
      ownedInCollection: 2,
      missingCount: 0,
    },
  ];

  const samplePriceSummary: PriceSummary = {
    provider: "cardmarket",
    currency: "EUR",
    currencySymbol: "€",
    totalCards: 8,
    totalNetValue: 5005.5,
    quotes: {
      "id-sol-ring": {
        cardName: "Sol Ring",
        scryfallId: "id-sol-ring",
        provider: "cardmarket",
        currency: "EUR",
        currencySymbol: "€",
        unitPrice: { trend: 1.5, min: 1.0, max: 4.0 },
        quantity: 1,
        subtotal: 1.5,
        purchaseUrl: "",
        lastUpdated: "",
      },
      "id-bolt": {
        cardName: "Lightning Bolt",
        scryfallId: "id-bolt",
        provider: "cardmarket",
        currency: "EUR",
        currencySymbol: "€",
        unitPrice: { trend: 2.0, min: 1.2, max: 5.0 },
        quantity: 4,
        subtotal: 8.0,
        purchaseUrl: "",
        lastUpdated: "",
      },
      "id-lotus": {
        cardName: "Black Lotus",
        scryfallId: "id-lotus",
        provider: "cardmarket",
        currency: "EUR",
        currencySymbol: "€",
        unitPrice: { trend: 5000.0, min: 4000.0, max: 10000.0 },
        quantity: 1,
        subtotal: 5000.0,
        purchaseUrl: "",
        lastUpdated: "",
      },
      "id-counterspell": {
        cardName: "Counterspell",
        scryfallId: "id-counterspell",
        provider: "cardmarket",
        currency: "EUR",
        currencySymbol: "€",
        unitPrice: { trend: 1.2, min: 0.8, max: 3.0 },
        quantity: 2,
        subtotal: 2.4,
        purchaseUrl: "",
        lastUpdated: "",
      },
    },
  };

  it("should sort cards by name A-Z and Z-A", () => {
    const asc = sortCards(sampleCards, "name", "asc");
    expect(asc.map((c) => c.cardName)).toEqual([
      "Black Lotus",
      "Counterspell",
      "Lightning Bolt",
      "Sol Ring",
    ]);

    const desc = sortCards(sampleCards, "name", "desc");
    expect(desc.map((c) => c.cardName)).toEqual([
      "Sol Ring",
      "Lightning Bolt",
      "Counterspell",
      "Black Lotus",
    ]);
  });

  it("should sort cards by CMC ascending and descending", () => {
    const asc = sortCards(sampleCards, "cmc", "asc");
    expect(asc.map((c) => c.cardName)).toEqual([
      "Black Lotus", // CMC 0
      "Lightning Bolt", // CMC 1
      "Sol Ring", // CMC 1
      "Counterspell", // CMC 2
    ]);
  });

  it("should sort cards by price trend ascending and descending", () => {
    const desc = sortCards(sampleCards, "price_trend", "desc", samplePriceSummary);
    expect(desc[0].cardName).toBe("Black Lotus"); // 5000€
    expect(desc[1].cardName).toBe("Lightning Bolt"); // 2.0€
    expect(desc[2].cardName).toBe("Sol Ring"); // 1.5€
    expect(desc[3].cardName).toBe("Counterspell"); // 1.2€

    const asc = sortCards(sampleCards, "price_trend", "asc", samplePriceSummary);
    expect(asc[0].cardName).toBe("Counterspell"); // 1.2€
    expect(asc[3].cardName).toBe("Black Lotus"); // 5000€
  });

  it("should sort cards by subtotal descending", () => {
    const desc = sortCards(sampleCards, "price_subtotal", "desc", samplePriceSummary);
    expect(desc[0].cardName).toBe("Black Lotus"); // 5000€
    expect(desc[1].cardName).toBe("Lightning Bolt"); // 8.0€ (4 * 2)
    expect(desc[2].cardName).toBe("Counterspell"); // 2.4€ (2 * 1.2)
    expect(desc[3].cardName).toBe("Sol Ring"); // 1.5€
  });

  it("should sort cards by status (missing first)", () => {
    const sorted = sortCards(sampleCards, "status", "asc");
    expect(sorted[0].missingCount).toBeGreaterThan(0);
  });

  it("should sort cards by requested decks count (most requested first)", () => {
    const cardsWithRequests: SortableCard[] = [
      { ...sampleCards[0], cardName: "Sol Ring", requestedInDecksCount: 2 },
      { ...sampleCards[1], cardName: "Lightning Bolt", requestedInDecksCount: 1 },
      { ...sampleCards[2], cardName: "Arcane Signet", requestedInDecksCount: 7 },
      { ...sampleCards[3], cardName: "Counterspell", requestedInDecksCount: 0 },
    ];

    const desc = sortCards(cardsWithRequests, "requested_decks", "desc");
    expect(desc.map((c) => c.cardName)).toEqual([
      "Arcane Signet",
      "Sol Ring",
      "Lightning Bolt",
      "Counterspell",
    ]);

    const asc = sortCards(cardsWithRequests, "requested_decks", "asc");
    expect(asc.map((c) => c.cardName)).toEqual([
      "Counterspell",
      "Lightning Bolt",
      "Sol Ring",
      "Arcane Signet",
    ]);
  });

  describe("matchesPriceFilter", () => {
    it("returns true when no min or max price is provided", () => {
      expect(
        matchesPriceFilter("Sol Ring", "id-sol-ring", null, null, samplePriceSummary.quotes)
      ).toBe(true);
    });

    it("filters correctly by minPrice", () => {
      // Sol Ring: 1.5, Bolt: 2.0, Lotus: 5000, Counterspell: 1.2
      expect(
        matchesPriceFilter("Sol Ring", "id-sol-ring", 1.5, null, samplePriceSummary.quotes)
      ).toBe(true);
      expect(
        matchesPriceFilter("Counterspell", "id-counterspell", 1.5, null, samplePriceSummary.quotes)
      ).toBe(false);
      expect(
        matchesPriceFilter("Black Lotus", "id-lotus", 1.5, null, samplePriceSummary.quotes)
      ).toBe(true);
    });

    it("filters correctly by maxPrice", () => {
      expect(
        matchesPriceFilter("Sol Ring", "id-sol-ring", null, 2.0, samplePriceSummary.quotes)
      ).toBe(true);
      expect(
        matchesPriceFilter("Lightning Bolt", "id-bolt", null, 2.0, samplePriceSummary.quotes)
      ).toBe(true);
      expect(
        matchesPriceFilter("Black Lotus", "id-lotus", null, 2.0, samplePriceSummary.quotes)
      ).toBe(false);
    });

    it("filters correctly by both minPrice and maxPrice range", () => {
      // Range 1.3 to 3.0: Sol Ring (1.5) and Bolt (2.0) should pass; Counterspell (1.2) and Lotus (5000) should fail
      expect(
        matchesPriceFilter("Sol Ring", "id-sol-ring", 1.3, 3.0, samplePriceSummary.quotes)
      ).toBe(true);
      expect(
        matchesPriceFilter("Lightning Bolt", "id-bolt", 1.3, 3.0, samplePriceSummary.quotes)
      ).toBe(true);
      expect(
        matchesPriceFilter("Counterspell", "id-counterspell", 1.3, 3.0, samplePriceSummary.quotes)
      ).toBe(false);
      expect(
        matchesPriceFilter("Black Lotus", "id-lotus", 1.3, 3.0, samplePriceSummary.quotes)
      ).toBe(false);
    });

    it("excludes unpriced cards when price filter is specified", () => {
      expect(
        matchesPriceFilter("Unknown Card", "unknown-id", 1.0, null, samplePriceSummary.quotes)
      ).toBe(false);
      expect(
        matchesPriceFilter("Unknown Card", "unknown-id", null, 5.0, samplePriceSummary.quotes)
      ).toBe(false);
    });
  });
});
