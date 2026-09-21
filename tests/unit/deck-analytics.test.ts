import { describe, it, expect } from "vitest";
import {
  parseManaValue,
  getCardColorsFromManaCost,
  getCardColorBucket,
  analyzeManaCurve,
  analyzeTypeDistribution,
  analyzeManaBaseAndColors,
  getOpeningHandProbabilities,
  calculateCommanderOnCurve,
  calculateHypergeometric,
} from "@/lib/deck-analytics";
import type { DeckCardWithOwnership } from "@/lib/schemas";

describe("deck-analytics", () => {
  it("parses mana values accurately", () => {
    expect(parseManaValue("{2}{U}{B}")).toBe(4);
    expect(parseManaValue("{X}{R}")).toBe(1);
    expect(parseManaValue("")).toBe(0);
    expect(parseManaValue(null)).toBe(0);
    expect(parseManaValue("{W/U}")).toBe(1);
    expect(parseManaValue("{5}")).toBe(5);
  });

  it("extracts colors from mana cost correctly", () => {
    expect(getCardColorsFromManaCost("{2}{U}{B}")).toEqual(["U", "B"]);
    expect(getCardColorsFromManaCost("{3}")).toEqual([]);
    expect(getCardColorsFromManaCost("{G}")).toEqual(["G"]);
    expect(getCardColorsFromManaCost("{R}{W}")).toEqual(["R", "W"]);
  });

  it("assigns card color bucket correctly", () => {
    expect(getCardColorBucket("{2}{U}{B}")).toBe("multi");
    expect(getCardColorBucket("{3}")).toBe("colorless");
    expect(getCardColorBucket("{G}")).toBe("green");
    expect(getCardColorBucket("{W}")).toBe("white");
    expect(getCardColorBucket("{R}")).toBe("red");
    expect(getCardColorBucket("{B}")).toBe("black");
    expect(getCardColorBucket("{U}")).toBe("blue");
  });

  it("calculates hypergeometric probabilities", () => {
    const res = calculateHypergeometric(99, 36, 7, 3);
    // P(X=3) for 36 successes in 99 with sample 7 is typically ~31%
    expect(res.exact).toBeGreaterThan(25);
    expect(res.exact).toBeLessThan(35);
    expect(res.atLeast).toBeGreaterThan(res.exact);
  });

  it("calculates opening hand probabilities table", () => {
    const probs = getOpeningHandProbabilities(99, 36);
    expect(probs.lands0or1).toBeGreaterThan(0);
    expect(probs.lands2).toBeGreaterThan(0);
    expect(probs.lands3).toBeGreaterThan(0);
    expect(probs.lands4).toBeGreaterThan(0);
    expect(probs.lands5plus).toBeGreaterThan(0);
    expect(probs.lands2to4).toBeGreaterThan(60); // In 36-land deck, 2-4 lands is ~70-80%
  });

  it("calculates commander on curve", () => {
    const onCurve = calculateCommanderOnCurve(99, 36, 4);
    expect(onCurve.turn).toBe(4);
    expect(onCurve.cardsSeen).toBe(10); // 7 opening + 3 draws
    expect(onCurve.probability).toBeGreaterThan(50);
  });

  it("analyzes mana curve with and without lands/commander", () => {
    const sampleCards: DeckCardWithOwnership[] = [
      {
        id: "1",
        deckId: "d1",
        cardScryfallId: "s1",
        cardName: "Commander Guy",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: true,
        manaCost: "{3}{U}{R}",
        typeLine: "Legendary Creature",
        imageUri: null,
        ownedInCollection: 1,
        availableToAssign: 1,
        assignedInOtherDecks: [],
        missingCount: 0,
        tags: ["Finisher"],
      },
      {
        id: "2",
        deckId: "d1",
        cardScryfallId: "s2",
        cardName: "Island",
        quantity: 35,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: null,
        typeLine: "Basic Land — Island",
        imageUri: null,
        ownedInCollection: 35,
        availableToAssign: 35,
        assignedInOtherDecks: [],
        missingCount: 0,
      },
      {
        id: "3",
        deckId: "d1",
        cardScryfallId: "s3",
        cardName: "Counterspell",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: "{U}{U}",
        typeLine: "Instant",
        imageUri: null,
        ownedInCollection: 1,
        availableToAssign: 1,
        assignedInOtherDecks: [],
        missingCount: 0,
        tags: ["Control"],
      },
    ];

    const withExclusions = analyzeManaCurve(sampleCards, { excludeLands: true, excludeCommander: true });
    // Only Counterspell is considered
    expect(withExclusions.avgCmc).toBe(2);
    expect(withExclusions.totalLands).toBe(35);

    const withLands = analyzeManaCurve(sampleCards, { excludeLands: false, excludeCommander: false });
    expect(withLands.curve[0].lands).toBe(35);
  });

  it("identifies taplands correctly", async () => {
    const { isTapland } = await import("@/lib/deck-analytics");
    expect(isTapland("Azorius Guildgate", "Land — Gate")).toBe(true);
    expect(isTapland("Temple of Epiphany", "Land")).toBe(true);
    expect(isTapland("Temple of the False God", "Land")).toBe(false);
    expect(isTapland("Simic Growth Chamber", "Land")).toBe(true);
    expect(isTapland("Raugrin Triome", "Land — Plains Island Mountain")).toBe(true);
    expect(isTapland("Tranquil Cove", "Land")).toBe(true);
    expect(isTapland("Island", "Basic Land — Island")).toBe(false);
    expect(isTapland("Command Tower", "Land")).toBe(false);
    expect(isTapland("Steam Vents", "Land — Island Mountain")).toBe(false);
  });

  it("filters color comparison and calculates taplands metrics with deckColors", () => {
    const sampleCards: DeckCardWithOwnership[] = [
      {
        id: "1",
        deckId: "d1",
        cardScryfallId: "s1",
        cardName: "Gruul Guildgate",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: null,
        typeLine: "Land — Gate",
        imageUri: null,
        ownedInCollection: 1,
        availableToAssign: 1,
        assignedInOtherDecks: [],
        missingCount: 0,
      },
      {
        id: "2",
        deckId: "d1",
        cardScryfallId: "s2",
        cardName: "Mountain",
        quantity: 9,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: null,
        typeLine: "Basic Land — Mountain",
        imageUri: null,
        ownedInCollection: 9,
        availableToAssign: 9,
        assignedInOtherDecks: [],
        missingCount: 0,
      },
      {
        id: "3",
        deckId: "d1",
        cardScryfallId: "s3",
        cardName: "Forest",
        quantity: 10,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: null,
        typeLine: "Basic Land — Forest",
        imageUri: null,
        ownedInCollection: 10,
        availableToAssign: 10,
        assignedInOtherDecks: [],
        missingCount: 0,
      },
      {
        id: "4",
        deckId: "d1",
        cardScryfallId: "s4",
        cardName: "Lightning Bolt",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: "{R}",
        typeLine: "Instant",
        imageUri: null,
        ownedInCollection: 1,
        availableToAssign: 1,
        assignedInOtherDecks: [],
        missingCount: 0,
      },
    ];

    const analysis = analyzeManaBaseAndColors(sampleCards, 1.0, ["R", "G"]);
    // Should only contain Red and Green
    expect(analysis.colorComparison.map((c) => c.color)).toEqual(["R", "G"]);
    expect(analysis.totalLands).toBe(20);
    expect(analysis.taplands.count).toBe(1);
    expect(analysis.taplands.percentage).toBe(5); // 1 / 20 = 5%
    expect(analysis.taplands.tempoDrag).toBeGreaterThanOrEqual(0);
    expect(analysis.taplands.openingHandProb).toBeGreaterThan(0);
  });
});
