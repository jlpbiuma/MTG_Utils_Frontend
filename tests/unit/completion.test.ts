import { describe, it, expect } from "vitest";
import { deckCompletionCounts, groupCardsByType } from "@/lib/card-utils";
import { selectionCompletion } from "@/lib/opportunity-selection";
import type { WhatsAppDealMatch } from "@/actions/whatsapp-matches";

describe("Presence-based completion across decks and offers", () => {
  it("one copy covers seven requested copies, including reprints with the same name", () => {
    const cards = [{ cardName: "Fire // Ice", quantity: 7, ownedInCollection: 1 }, { cardName: " FIRE / Ice ", quantity: 2, ownedInCollection: 0 }];
    expect(deckCompletionCounts(cards)).toEqual({ total: 1, owned: 1, missing: 0, percentage: 100 });
    expect(groupCardsByType(cards)[0].completionPercentage).toBe(100);
  });
  it("excludes sideboard even if it is marked commander", () => {
    expect(deckCompletionCounts([{ cardName: "Main", quantity: 7, ownedInCollection: 1 }, { cardName: "Side", quantity: 99, isSideboard: true }])).toEqual({ total: 1, owned: 1, missing: 0, percentage: 100 });
    expect(deckCompletionCounts([{ cardName: "Side", quantity: 7, isSideboard: true }]).percentage).toBe(0);
  });
  it("counts basics as covered and rounds by distinct names", () => {
    expect(deckCompletionCounts([{ cardName: "Forest", quantity: 40 }, { cardName: "A", quantity: 7 }, { cardName: "B", quantity: 7 }]).percentage).toBe(33.3);
    expect(deckCompletionCounts([])).toEqual({ total: 0, owned: 0, missing: 0, percentage: 0 });
  });
  it("projects 0.5 points for one of two 100-name decks and 1 point for both", () => {
    const impact = (deck: string) => ({ deck_card_id: deck, deck_id: deck, total_cards: 100, owned_cards: 0, quantity: 7, assigned_quantity: 0, collection_quantity: 0 });
    const a: WhatsAppDealMatch = { id: 1, card_name: "A", normalized_name: "a", subject: "vende", whatsapp_url: "x", source_phone: "", direct_whatsapp_link: "", extra: {}, trade_quantity: 1, completion_requirements: [impact("a")] };
    const b = { ...a, id: 2, card_name: "B", normalized_name: "b", completion_requirements: [impact("a"), impact("b")] };
    expect(selectionCompletion([a], {}, 2, 0).gain).toBe(0.5);
    expect(selectionCompletion([b], {}, 2, 0).gain).toBe(1);
    expect(selectionCompletion([a, b], {}, 2, 0).gain).toBe(1.5);
    expect(selectionCompletion([b, { ...b, id: 3, trade_quantity: 7 }], {}, 2, 0).gain).toBe(1);
  });
});
