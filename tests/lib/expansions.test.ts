import { describe, expect, it } from "vitest";
import { filterExpansions, getExpansionProgress, organizeExpansionCards, summarizeAcquisitionBalance } from "@/lib/expansions";
import type { Expansion, ExpansionCard } from "@/actions/expansions";

const sets: Expansion[] = [
  { code: "tst", name: "Test Expansion", setType: "expansion", cardCount: 4, ownedCount: 2, completionPercentage: 50, totalValueEur: 0, ownedValueEur: 0 },
  { code: "plst", name: "The List", setType: "masters", cardCount: 500, ownedCount: 0, completionPercentage: 0, totalValueEur: 0, ownedValueEur: 0 },
  { code: "promo", name: "Promo Pack", setType: "promo", cardCount: 10, ownedCount: 0, completionPercentage: 0, totalValueEur: 0, ownedValueEur: 0 },
];
const cards: ExpansionCard[] = [
  { id: "1", catalogId: "c1", setCode: "tst", collectorNumber: "2", cardName: "Beta", rarity: "rare", typeLine: "Creature — Human", priceCardmarketTrend: 5, priceTrendAbsoluteChange: 2, priceTrendPercentageChange: 10, isOwned: true, ownedQuantity: 2 },
  { id: "2", catalogId: "c2", setCode: "tst", collectorNumber: "10", cardName: "Alpha", rarity: "common", typeLine: "Instant", priceCardmarketTrend: 1, priceTrendAbsoluteChange: -1, priceTrendPercentageChange: -20, isOwned: false, ownedQuantity: 0 },
  { id: "3", catalogId: "c1", setCode: "tst", collectorNumber: "2a", cardName: "Beta", rarity: "rare", typeLine: "Creature — Human", priceCardmarketTrend: 5, priceTrendAbsoluteChange: 2, priceTrendPercentageChange: 10, isOwned: true, ownedQuantity: 2 },
];

describe("expansion catalog helpers", () => {
  it("limits expansion index to supported product sets and searches name/code", () => {
    expect(filterExpansions(sets, "expan").map((set) => set.code)).toEqual(["tst"]);
    expect(filterExpansions(sets, "TST").map((set) => set.code)).toEqual(["tst"]);
  });

  it("counts each listed printing and guards empty expansions", () => {
    expect(getExpansionProgress(cards)).toEqual({ owned: 2, total: 3, percentage: 67 });
    expect(getExpansionProgress([])).toEqual({ owned: 0, total: 0, percentage: 0 });
  });

  it("filters, searches, sorts and groups cards without changing the source list", () => {
    const missing = organizeExpansionCards(cards, { filter: "missing", sort: "price", direction: "desc", group: "none", query: "" });
    expect(missing[0].cards.map((card) => card.cardName)).toEqual(["Alpha"]);
    const sorted = organizeExpansionCards(cards, { filter: "all", sort: "name", direction: "asc", group: "rarity", query: "" });
    expect(sorted.map((section) => section.key)).toEqual(["Common", "Rare"]);
    expect(sorted.flatMap((section) => section.cards).map((card) => card.cardName)).toEqual(["Alpha", "Beta", "Beta"]);
    expect(organizeExpansionCards(cards, { filter: "owned", sort: "number", direction: "asc", group: "type", query: "beta" })).toHaveLength(1);
    expect(cards).toHaveLength(3);
  });

  it("sorts price trends in either direction and keeps cards without history last", () => {
    const absAscending = organizeExpansionCards(cards, { filter: "all", sort: "trend_abs", direction: "asc", group: "none", query: "" });
    const absDescending = organizeExpansionCards(cards, { filter: "all", sort: "trend_abs", direction: "desc", group: "none", query: "" });
    const pctAscending = organizeExpansionCards(cards, { filter: "all", sort: "trend_pct", direction: "asc", group: "none", query: "" });
    const pctDescending = organizeExpansionCards(cards, { filter: "all", sort: "trend_pct", direction: "desc", group: "none", query: "" });
    expect(absAscending[0].cards.map((card) => card.cardName)).toEqual(["Alpha", "Beta", "Beta"]);
    expect(absDescending[0].cards.map((card) => card.cardName)).toEqual(["Beta", "Beta", "Alpha"]);
    expect(pctAscending[0].cards.map((card) => card.cardName)).toEqual(["Alpha", "Beta", "Beta"]);
    expect(pctDescending[0].cards.map((card) => card.cardName)).toEqual(["Beta", "Beta", "Alpha"]);

    const withUnknown = [...cards, { ...cards[0], id: "no-history", cardName: "No history", priceTrendAbsoluteChange: null, priceTrendPercentageChange: null }];
    expect(organizeExpansionCards(withUnknown, { filter: "all", sort: "trend_pct", direction: "desc", group: "none", query: "" })[0].cards.at(-1)?.cardName).toBe("No history");
  });

  it("calculates net acquisition balance once per owned collection card", () => {
    const owned = [
      { ...cards[0], collectionCardId: "collection-1", acquiredAt: "2026-01-01", acquisitionTrendAbsoluteChange: -1 },
      { ...cards[2], collectionCardId: "collection-1", acquiredAt: "2026-01-01", acquisitionTrendAbsoluteChange: -1 },
    ];
    const balance = summarizeAcquisitionBalance(owned);
    expect(balance).toMatchObject({ currentValue: 10, acquisitionValue: 12, absoluteChange: -2, measuredCards: 1 });
    expect(balance.percentageChange).toBeCloseTo(-100 / 6);
  });
});
