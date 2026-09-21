import { describe, it, expect } from "vitest";
import {
  getCardCategory,
  groupCardsByType,
  isBasicLand,
  CARD_TYPE_GROUPS,
} from "@/lib/card-utils";
import { PriceSummary } from "@/lib/pricing/types";

describe("Card Type Categorization & Grouping", () => {
  describe("getCardCategory", () => {
    it("categorizes standard English MTG types correctly", () => {
      expect(getCardCategory("Creature — Human Soldier")).toBe("creatures");
      expect(getCardCategory("Artifact Creature — Golem")).toBe("creatures"); // creature precedence
      expect(getCardCategory("Enchantment Creature — God")).toBe("creatures");
      expect(getCardCategory("Legendary Planeswalker — Chandra")).toBe("planeswalkers");
      expect(getCardCategory("Instant")).toBe("instants");
      expect(getCardCategory("Sorcery")).toBe("sorceries");
      expect(getCardCategory("Artifact — Equipment")).toBe("artifacts");
      expect(getCardCategory("Enchantment — Aura")).toBe("enchantments");
      expect(getCardCategory("Battle — Siege")).toBe("battles");
      expect(getCardCategory("Basic Land — Mountain")).toBe("lands");
      expect(getCardCategory("Land")).toBe("lands");
    });

    it("categorizes Spanish MTG types correctly", () => {
      expect(getCardCategory("Criatura legendaria — Humano")).toBe("creatures");
      expect(getCardCategory("Instantáneo")).toBe("instants");
      expect(getCardCategory("Conjuro")).toBe("sorceries");
      expect(getCardCategory("Artefacto")).toBe("artifacts");
      expect(getCardCategory("Encantamiento")).toBe("enchantments");
      expect(getCardCategory("Batalla — Asedio")).toBe("battles");
      expect(getCardCategory("Tierra básica — Montaña")).toBe("lands");
    });

    it("falls back to other for unknown or missing types when cardName is unknown or missing", () => {
      expect(getCardCategory(null)).toBe("other");
      expect(getCardCategory(undefined)).toBe("other");
      expect(getCardCategory("")).toBe("other");
      expect(getCardCategory("Conspiracy")).toBe("other");
      expect(getCardCategory(null, "Unknown Card 12345")).toBe("other");
    });

    it("uses cardName heuristics to categorize basic and ubiquitous lands when typeLine is missing", () => {
      expect(getCardCategory(null, "Island")).toBe("lands");
      expect(getCardCategory(null, "Mountain")).toBe("lands");
      expect(getCardCategory(null, "Plains")).toBe("lands");
      expect(getCardCategory(null, "Swamp")).toBe("lands");
      expect(getCardCategory(null, "Forest")).toBe("lands");
      expect(getCardCategory(null, "Wastes")).toBe("lands");
      expect(getCardCategory(null, "Snow-Covered Island")).toBe("lands");
      expect(getCardCategory(null, "Command Tower")).toBe("lands");
      expect(getCardCategory(null, "Reliquary Tower")).toBe("lands");
      expect(getCardCategory(null, "Izzet Boilerworks")).toBe("lands");
      expect(getCardCategory(null, "Spara's Headquarters")).toBe("lands");
      expect(getCardCategory(null, "Evolving Wilds")).toBe("lands");
    });
  });

  describe("groupCardsByType", () => {
    const mockPriceSummary: PriceSummary = {
      provider: "cardmarket",
      currency: "EUR",
      currencySymbol: "€",
      totalCards: 10,
      totalNetValue: 100,
      totalMissingValue: 30,
      quotes: {
        "scry-bolt": {
          cardName: "Lightning Bolt",
          provider: "cardmarket",
          currency: "EUR",
          currencySymbol: "€",
          unitPrice: { trend: 2.5, min: 1.0, max: 5.0 },
          subtotal: 10,
          quantity: 4,
          lastUpdated: new Date().toISOString(),
        },
        "scry-goyf": {
          cardName: "Tarmogoyf",
          provider: "cardmarket",
          currency: "EUR",
          currencySymbol: "€",
          unitPrice: { trend: 15.0, min: 10.0, max: 20.0 },
          subtotal: 60,
          quantity: 4,
          lastUpdated: new Date().toISOString(),
        },
        "scry-mountain": {
          cardName: "Mountain",
          provider: "cardmarket",
          currency: "EUR",
          currencySymbol: "€",
          unitPrice: { trend: 0.1, min: 0.05, max: 0.5 },
          subtotal: 1,
          quantity: 10,
          lastUpdated: new Date().toISOString(),
        },
      },
    };

    it("returns empty array for empty cards list", () => {
      const sections = groupCardsByType([], mockPriceSummary);
      expect(sections).toEqual([]);
    });

    it("groups cards and orders sections by standard MTG hierarchy", () => {
      const cards = [
        {
          cardName: "Mountain",
          cardScryfallId: "scry-mountain",
          typeLine: "Basic Land — Mountain",
          quantity: 10,
          ownedInCollection: 10,
          missingCount: 0,
        },
        {
          cardName: "Tarmogoyf",
          cardScryfallId: "scry-goyf",
          typeLine: "Creature — Lhurgoyf",
          quantity: 4,
          ownedInCollection: 2,
          missingCount: 2,
        },
        {
          cardName: "Lightning Bolt",
          cardScryfallId: "scry-bolt",
          typeLine: "Instant",
          quantity: 4,
          ownedInCollection: 4,
          missingCount: 0,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary);

      expect(sections.length).toBe(3);
      // Order: creatures (order 1), instants (order 3), lands (order 8)
      expect(sections[0].key).toBe("creatures");
      expect(sections[0].label).toBe("Criaturas");
      expect(sections[1].key).toBe("instants");
      expect(sections[1].label).toBe("Instantáneos");
      expect(sections[2].key).toBe("lands");
      expect(sections[2].label).toBe("Tierras");
    });

    it("calculates section stats, completion percentage, and price accurately", () => {
      const cards = [
        {
          cardName: "Tarmogoyf",
          cardScryfallId: "scry-goyf",
          typeLine: "Creature — Lhurgoyf",
          quantity: 4,
          ownedInCollection: 2,
          missingCount: 2,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary);
      expect(sections.length).toBe(1);

      const creatureSection = sections[0];
      expect(creatureSection.totalCards).toBe(4);
      expect(creatureSection.uniqueCards).toBe(1);
      expect(creatureSection.ownedCards).toBe(2);
      expect(creatureSection.missingCards).toBe(2);
      expect(creatureSection.completionPercentage).toBe(50); // 2/4 = 50%
      expect(creatureSection.sectionTotalPrice).toBe(60); // 15.0 * 4 = 60
      expect(creatureSection.sectionMissingPrice).toBe(30); // 15.0 * 2 = 30
      expect(creatureSection.sectionOwnedPrice).toBe(30); // 15.0 * 2 = 30
      expect(creatureSection.currencySymbol).toBe("€");
    });

    it("handles cards with 100% completion correctly", () => {
      const cards = [
        {
          cardName: "Lightning Bolt",
          cardScryfallId: "scry-bolt",
          typeLine: "Instant",
          quantity: 4,
          ownedInCollection: 4,
          missingCount: 0,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary);
      const instantSection = sections[0];

      expect(instantSection.completionPercentage).toBe(100);
      expect(instantSection.missingCards).toBe(0);
      expect(instantSection.sectionMissingPrice).toBe(0);
      expect(instantSection.sectionTotalPrice).toBe(10); // 2.5 * 4 = 10
      expect(instantSection.sectionOwnedPrice).toBe(10); // 100% owned -> 10
    });

    it("groups lands using cardName heuristics when typeLine is missing/null", () => {
      const cards = [
        {
          cardName: "Island",
          cardScryfallId: "pending:island",
          typeLine: null,
          quantity: 10,
          ownedInCollection: 10,
          missingCount: 0,
        },
        {
          cardName: "Command Tower",
          cardScryfallId: "pending:command-tower",
          typeLine: null,
          quantity: 1,
          ownedInCollection: 1,
          missingCount: 0,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary);
      expect(sections.length).toBe(1);
      expect(sections[0].key).toBe("lands");
      expect(sections[0].label).toBe("Tierras");
      expect(sections[0].totalCards).toBe(11);
      expect(sections[0].uniqueCards).toBe(2);
    });

    it("excludes basic lands from completion stats when option is enabled", () => {
      const cards = [
        {
          cardName: "Mountain",
          cardScryfallId: "scry-mountain",
          typeLine: "Basic Land — Mountain",
          quantity: 30,
          ownedInCollection: 30,
          missingCount: 0,
        },
        {
          cardName: "Island",
          cardScryfallId: "pending:island",
          typeLine: "Basic Land — Island",
          quantity: 20,
          ownedInCollection: 0,
          missingCount: 20,
        },
        {
          cardName: "Command Tower",
          cardScryfallId: "pending:command-tower",
          typeLine: "Land",
          quantity: 1,
          ownedInCollection: 1,
          missingCount: 0,
        },
        {
          cardName: "Tarmogoyf",
          cardScryfallId: "scry-goyf",
          typeLine: "Creature — Lhurgoyf",
          quantity: 4,
          ownedInCollection: 2,
          missingCount: 2,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary, { excludeBasicLands: true });

      const lands = sections.find((s) => s.key === "lands")!;
      // Only Command Tower counts toward completion; basics never count
      // in the numerator nor the denominator.
      expect(lands.totalCards).toBe(1);
      expect(lands.ownedCards).toBe(1);
      expect(lands.missingCards).toBe(0);
      expect(lands.completionPercentage).toBe(100);
      // Basics remain visible in the section card list
      expect(lands.cards.map((c) => c.cardName)).toEqual([
        "Mountain",
        "Island",
        "Command Tower",
      ]);
      // Prices still include basic lands (Mountain 0.10 * 30 = 3.00)
      expect(lands.sectionTotalPrice).toBe(3);

      const creatures = sections.find((s) => s.key === "creatures")!;
      expect(creatures.totalCards).toBe(4);
      expect(creatures.missingCards).toBe(2);
    });

    it("counts basic lands in completion stats as 100% owned without needing collection assignment", () => {
      const cards = [
        {
          cardName: "Island",
          cardScryfallId: "pending:island",
          typeLine: "Basic Land — Island",
          quantity: 20,
          ownedInCollection: 0,
          missingCount: 0,
        },
        {
          cardName: "Command Tower",
          cardScryfallId: "pending:command-tower",
          typeLine: "Land",
          quantity: 1,
          ownedInCollection: 0,
          missingCount: 1,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary);
      const lands = sections[0];
      expect(lands.totalCards).toBe(21);
      // Basics are always owned (20), only Command Tower is missing (1)
      expect(lands.missingCards).toBe(1);
      expect(lands.ownedCards).toBe(20);
      expect(lands.completionPercentage).toBe(95.2); // 20/21 = 95.2%
    });

    it("treats sections made only of basic lands as fully complete", () => {
      const cards = [
        {
          cardName: "Mountain",
          cardScryfallId: "scry-mountain",
          typeLine: "Basic Land — Mountain",
          quantity: 30,
          ownedInCollection: 0,
          missingCount: 0,
        },
      ];

      const sections = groupCardsByType(cards, mockPriceSummary, { excludeBasicLands: true });
      const lands = sections[0];
      expect(lands.totalCards).toBe(0);
      expect(lands.completionPercentage).toBe(100);
    });
  });

  describe("isBasicLand", () => {
    it("detects basic lands via type line", () => {
      expect(isBasicLand("Basic Land — Island", "Island")).toBe(true);
      expect(isBasicLand("Basic Land — Snow-Covered Forest", "Snow-Covered Forest")).toBe(true);
      expect(isBasicLand("Basic Land", "Wastes")).toBe(true);
      // Names of the five basics are always basic lands regardless of type line
      expect(isBasicLand("Land — Island", "Island")).toBe(true);
      expect(isBasicLand("Land", "Command Tower")).toBe(false);
      expect(isBasicLand("Creature — Merfolk", "Spellskite")).toBe(false);
    });

    it("detects basic lands by name when type line is missing", () => {
      for (const name of [
        "Plains",
        "Island",
        "Swamp",
        "Mountain",
        "Forest",
        "Wastes",
        "Snow-Covered Plains",
        "Snow-Covered Island",
        "Snow-Covered Swamp",
        "Snow-Covered Mountain",
        "Snow-Covered Forest",
      ]) {
        expect(isBasicLand(null, name)).toBe(true);
        expect(isBasicLand("", name)).toBe(true);
      }
      expect(isBasicLand(null, "Command Tower")).toBe(false);
      expect(isBasicLand(null, "Evolving Wilds")).toBe(false);
      expect(isBasicLand(null, "Sol Ring")).toBe(false);
    });
  });
});
