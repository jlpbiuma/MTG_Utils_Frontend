import { describe, expect, it } from "vitest";
import { simulationListCards, sortSimulationCards, matchesSimulationFilter } from "@/lib/simulated-card-list";
import type { SimulatedCollectionAnalysisResponse } from "@/actions/simulated-collections";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";

const base = fixture as SimulatedCollectionAnalysisResponse;

describe("simulated list prices and membership", () => {
  it("combines editions using their quantities and preserves the separate purchase rows", () => {
    const card = base.cards[0];
    const purchase = base.purchaseAnalysis!.cards[0];
    const cards = simulationListCards({ ...base,
      cards: [{ ...card, quantity: 3 }],
      purchaseAnalysis: { ...base.purchaseAnalysis!, cards: [
        { ...purchase, quantity: 1, purchaseTotal: 2, marketTotal: 3, savings: 1 },
        { ...purchase, quantity: 2, collectorNumber: "99", purchaseTotal: 8, marketTotal: 12, savings: 4 },
      ] },
    });
    expect(cards[0]).toMatchObject({ purchasePrice: 10, marketPrice: 15, marketUnitPrice: 5, priceDifference: 5, inWants: true });
    expect(cards[0].purchaseUnitPrice).toBeCloseTo(10 / 3);
    expect(cards[0].purchaseRows).toHaveLength(2);
  });

  it("leaves incomplete comparisons unknown and respects wants outside priced carts", () => {
    const purchase = base.purchaseAnalysis!.cards[0];
    const [card] = simulationListCards({ ...base, cards: [{ ...base.cards[0], inWants: true }], purchaseAnalysis: {
      ...base.purchaseAnalysis!, cards: [{ ...purchase, purchaseTotal: null, savings: null }],
    } });
    expect(card.purchasePrice).toBeNull();
    expect(card.priceDifference).toBeNull();
    const [plain] = simulationListCards({ ...base, purchaseAnalysis: null, cards: [{ ...base.cards[0], inWants: true, copiesNeededTotal: 1, copiesOwnedReal: 2 }] });
    expect(matchesSimulationFilter(plain, "wants")).toBe(true);
    expect(matchesSimulationFilter(plain, "decks")).toBe(true);
    expect(matchesSimulationFilter(plain, "owned")).toBe(true);
    expect(matchesSimulationFilter(plain, "unrelated")).toBe(false);
    expect(plain.purchasePrice).toBeNull();
  });

  it.each(["unit-asc", "unit-desc", "purchase-asc", "purchase-desc", "difference-asc", "difference-desc"] as const)("sorts %s with unknown prices last, without mutating input", sort => {
    const sample = simulationListCards(base)[0];
    const cards = [
      { ...sample, cardName: "Unknown", marketUnitPrice: null, purchasePrice: null, priceDifference: null },
      { ...sample, cardName: "High", marketUnitPrice: 3, purchasePrice: 3, priceDifference: 3 },
      { ...sample, cardName: "Low", marketUnitPrice: 0, purchasePrice: 0, priceDifference: -2 },
    ];
    expect(sortSimulationCards(cards, sort).map(c => c.cardName)).toEqual(sort.endsWith("asc") ? ["Low", "High", "Unknown"] : ["High", "Low", "Unknown"]);
    expect(cards[0].cardName).toBe("Unknown");
  });
});
