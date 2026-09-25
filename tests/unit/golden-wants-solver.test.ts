import { describe, it, expect } from "vitest";
import { solveGoldenWants, matchesPriceOpportunity, comparePriceOpportunities } from "@/lib/golden-wants-solver";
import type { PriorityItem } from "@/actions/priorities";

describe("golden-wants-solver", () => {
  it("purchases only 1 unit per card, satisfying all decks needing it", () => {
    const items: PriorityItem[] = [
      {
        cardName: "Sol Ring",
        cardScryfallId: "sr-1",
        imageUri: null,
        manaCost: "{1}",
        typeLine: "Artifact",
        numDecks: 3,
        decks: [
          {
            deckId: "deck-1",
            deckName: "Deck 1",
            completionPercentage: 90,
            colors: ["U", "R"],
            requestedQuantity: 1,
            assignedQuantity: 0,
            missingQuantity: 1,
            deckCardId: "dc-1",
          },
          {
            deckId: "deck-2",
            deckName: "Deck 2",
            completionPercentage: 80,
            colors: ["G", "W"],
            requestedQuantity: 1,
            assignedQuantity: 0,
            missingQuantity: 1,
            deckCardId: "dc-2",
          },
          {
            deckId: "deck-3",
            deckName: "Deck 3",
            completionPercentage: 70,
            colors: ["B"],
            requestedQuantity: 1,
            assignedQuantity: 0,
            missingQuantity: 1,
            deckCardId: "dc-3",
          },
        ],
        copiesOwned: 0,
        copiesNeeded: 3,
        deficit: 3,
        price: 2.0,
        totalDeficitCost: 6.0,
        isReassignable: false,
        reassignOptions: [],
        maxDeckCompletion: 90,
      },
    ];

    const result = solveGoldenWants(items, 10, "complete_decks");
    expect(result.cart.length).toBe(1);
    expect(result.cart[0].quantityToBuy).toBe(1);
    expect(result.cart[0].totalCost).toBe(2.0);
    expect(result.totalCost).toBe(2.0);
    expect(result.totalCardsToBuy).toBe(1);
    // All 3 decks should be listed in targetDecks
    expect(result.cart[0].targetDecks.length).toBe(3);
    // All 3 decks should gain +1 fulfilled card
    expect(result.projectedProgress.length).toBe(3);
    for (const p of result.projectedProgress) {
      expect(p.cardsFulfilled).toBe(1);
    }
  });

  it("does not falsely complete a 20% deck with 80 missing cards when only 4 cards are purchased", () => {
    // 4 cards belonging to a deck that is at 20% (80 missing cards)
    const items: PriorityItem[] = [1, 2, 3, 4].map((i) => ({
      cardName: `Eldrazi Card ${i}`,
      cardScryfallId: `ec-${i}`,
      imageUri: null,
      manaCost: "{3}",
      typeLine: "Creature",
      numDecks: 1,
      decks: [
        {
          deckId: "eldrazis-cascade",
          deckName: "Eldrazis Cascade",
          completionPercentage: 20.0,
          colors: ["C", "G"],
          requestedQuantity: 1,
          assignedQuantity: 0,
          missingQuantity: 1,
          deckCardId: `dc-ec-${i}`,
          deckTotalCards: 100,
          deckMissingCards: 80,
        },
      ],
      copiesOwned: 0,
      copiesNeeded: 1,
      deficit: 1,
      price: 2.0,
      totalDeficitCost: 2.0,
      isReassignable: false,
      reassignOptions: [],
      maxDeckCompletion: 20.0,
    }));

    const result = solveGoldenWants(items, 50, "complete_decks");

    // All 4 cards bought (costs 8€ <= 50€)
    expect(result.cart.length).toBe(4);
    expect(result.totalCost).toBe(8.0);

    // Eldrazis Cascade CANNOT be completed! 4 cards out of 80 is NOT complete!
    expect(result.completedDecks.length).toBe(0);

    const progress = result.projectedProgress.find((p) => p.deckId === "eldrazis-cascade");
    expect(progress).toBeDefined();
    expect(progress!.before).toBe(20.0);
    // 20 cards owned + 4 fulfilled = 24 / 100 = 24.0%
    expect(progress!.after).toBe(24.0);
    expect(progress!.gainedPercentage).toBe(4.0);
    expect(progress!.cardsFulfilled).toBe(4);
    expect(progress!.totalMissingInitially).toBe(80);
  });

  it("successfully closes a deck to 100% when all missing cards are available and fit in budget", () => {
    // Deck with 98% completion, 2 missing cards
    const items: PriorityItem[] = [
      {
        cardName: "Finisher Alpha",
        cardScryfallId: "fa-1",
        imageUri: null,
        manaCost: "{1}",
        typeLine: "Instant",
        numDecks: 1,
        decks: [
          {
            deckId: "deck-near",
            deckName: "Near 100% Deck",
            completionPercentage: 98.0,
            colors: ["W"],
            requestedQuantity: 1,
            assignedQuantity: 0,
            missingQuantity: 1,
            deckCardId: "dc-fa",
            deckTotalCards: 100,
            deckMissingCards: 2,
          },
        ],
        copiesOwned: 0,
        copiesNeeded: 1,
        deficit: 1,
        price: 1.5,
        totalDeficitCost: 1.5,
        isReassignable: false,
        reassignOptions: [],
        maxDeckCompletion: 98.0,
      },
      {
        cardName: "Finisher Beta",
        cardScryfallId: "fb-1",
        imageUri: null,
        manaCost: "{2}",
        typeLine: "Sorcery",
        numDecks: 1,
        decks: [
          {
            deckId: "deck-near",
            deckName: "Near 100% Deck",
            completionPercentage: 98.0,
            colors: ["W"],
            requestedQuantity: 1,
            assignedQuantity: 0,
            missingQuantity: 1,
            deckCardId: "dc-fb",
            deckTotalCards: 100,
            deckMissingCards: 2,
          },
        ],
        copiesOwned: 0,
        copiesNeeded: 1,
        deficit: 1,
        price: 2.0,
        totalDeficitCost: 2.0,
        isReassignable: false,
        reassignOptions: [],
        maxDeckCompletion: 98.0,
      },
    ];

    const result = solveGoldenWants(items, 10, "complete_decks");

    expect(result.cart.length).toBe(2);
    expect(result.totalCost).toBe(3.5);

    // Deck must be in completedDecks!
    expect(result.completedDecks.length).toBe(1);
    expect(result.completedDecks[0].deckId).toBe("deck-near");

    const progress = result.projectedProgress.find((p) => p.deckId === "deck-near");
    expect(progress).toBeDefined();
    expect(progress!.before).toBe(98.0);
    expect(progress!.after).toBe(100.0);
    expect(progress!.gainedPercentage).toBe(2.0);
    expect(progress!.cardsFulfilled).toBe(2);
    expect(progress!.totalMissingInitially).toBe(2);
  });
});


describe("price opportunities", () => {
  const candidate = (changes: Partial<PriorityItem> = {}): PriorityItem => ({
    cardName: "Candidate", cardScryfallId: "candidate", numDecks: 1,
    decks: [{ deckId: "deck", deckName: "Deck", completionPercentage: 99,
      colors: [], requestedQuantity: 1, assignedQuantity: 0, missingQuantity: 1,
      deckCardId: "dc", deckTotalCards: 100, deckMissingCards: 1 }],
    copiesOwned: 0, copiesNeeded: 1, deficit: 1, price: 2, totalDeficitCost: 2,
    isReassignable: false, reassignOptions: [], maxDeckCompletion: 99, ...changes,
  });

  it("excludes unknown, flat and rising prices from falling filters", () => {
    for (const change30dPercent of [undefined, null, 0, 10]) {
      expect(matchesPriceOpportunity(candidate({ change30dPercent }), "falling")).toBe(false);
    }
    expect(matchesPriceOpportunity(candidate({ change30dPercent: -1 }), "opportunities")).toBe(true);
    expect(matchesPriceOpportunity(candidate({ atHistoricalLow: true }), "opportunities")).toBe(true);
  });

  it.each(["complete_decks", "max_completion"] as const)("respects price filters and budget for %s", (strategy) => {
    const item = candidate({ atHistoricalLow: true });
    expect(solveGoldenWants([item], 2, strategy, "historical_low").completedDecks).toHaveLength(1);
    expect(solveGoldenWants([item], 1, strategy, "historical_low").cart).toHaveLength(0);
    expect(solveGoldenWants([item], 2, strategy, "falling").cart).toHaveLength(0);
  });

  it("orders historical lows first, then larger declines and unknowns last", () => {
    const items = [candidate(), candidate({ change30dPercent: -10 }), candidate({ atHistoricalLow: true }), candidate({ change30dPercent: -30 })];
    expect([...items].sort(comparePriceOpportunities)).toEqual([items[2], items[3], items[1], items[0]]);
  });

  it("maximizes actual completion points within the budget", () => {
    const cheap = candidate({ cardScryfallId: "cheap", price: 1 });
    const impactful = candidate({ cardScryfallId: "impactful", price: 2,
      decks: [{ ...cheap.decks[0], deckId: "small", deckTotalCards: 10, deckMissingCards: 1, completionPercentage: 90 }] });
    expect(solveGoldenWants([cheap, impactful], 2, "max_completion").cart[0].cardScryfallId).toBe("impactful");
  });
});
