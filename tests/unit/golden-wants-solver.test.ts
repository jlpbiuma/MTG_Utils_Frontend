import { describe, it, expect } from "vitest";
import { solveGoldenWants } from "@/lib/golden-wants-solver";
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
});
