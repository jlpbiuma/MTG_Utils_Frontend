import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeckDetailView } from "@/components/deck-detail-view";
import { DeckDetailWithStats } from "@/lib/schemas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/actions/decks", () => ({
  addMissingCardsToCollection: vi.fn(),
  addMissingCardToCollection: vi.fn(),
  updateDeckCardVersion: vi.fn(),
  addCardToDeck: vi.fn(),
  updateDeckCardQuantity: vi.fn(),
  removeCardFromDeck: vi.fn(),
  assignCardToDeck: vi.fn(),
  unassignCardFromDeck: vi.fn(),
  reassignCardToDeck: vi.fn().mockResolvedValue({ success: true }),
  deleteDeck: vi.fn(),
  setDeckCommander: vi.fn(),
}));

vi.mock("@/actions/wants", () => ({
  addOrIncrementWant: vi.fn().mockResolvedValue({ success: true }),
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeckDetailView - Origin, Wants and Section Header Prices", () => {
  const mockDeck: DeckDetailWithStats = {
    id: "deck-origin-test",
    userId: "user-1",
    name: "Spiderman Deck",
    format: "Commander",
    description: null,
    commander: "Norman Osborn",
    commanderScryfallId: "norman-scry-id",
    commanderImageUri: "https://example.com/norman.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 2,
    uniqueCards: 2,
    ownedCards: 1,
    missingCardsCount: 1,
    completionPercentage: 50,
    totalValue: 15.0,
    missingValue: 10.0,
    ownedValue: 5.0,
    currency: "EUR",
    currencySymbol: "€",
    cards: [
      {
        id: "card-sol-ring",
        deckId: "deck-origin-test",
        cardScryfallId: "sol-scry-id",
        cardName: "Sol Ring",
        quantity: 2,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: "{1}",
        typeLine: "Artifact",
        imageUri: "https://example.com/solring.jpg",
        ownedInCollection: 1, // Owns 1, but needs 2!
        availableToAssign: 1,
        assignedInOtherDecks: [
          {
            deckId: "deck-other-1",
            deckName: "Other Deck",
            quantity: 1,
          },
        ],
        missingCount: 1, // Still missing 1 copy
      },
      {
        id: "card-norman",
        deckId: "deck-origin-test",
        cardScryfallId: "norman-scry-id",
        cardName: "Norman Osborn",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: true,
        manaCost: "{3}{B}",
        typeLine: "Legendary Creature",
        imageUri: "https://example.com/norman.jpg",
        ownedInCollection: 0,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 1,
      },
    ],
  };

  it("displays card origin with link to other deck and reassign button even when availableToAssign > 0", () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Should show "⚠️ Asignada en:"
    expect(screen.getByText("⚠️ Asignada en:")).toBeInTheDocument();

    // Link to other deck
    const otherDeckLink = screen.getByText("Other Deck (1)");
    expect(otherDeckLink).toBeInTheDocument();
    expect(otherDeckLink.closest("a")).toHaveAttribute("href", "/decks/deck-other-1");

    // Reassign button
    const reassignBtn = screen.getByTitle("Reasignar copia física desde Other Deck a este mazo");
    expect(reassignBtn).toBeInTheDocument();

    // Available to assign button is also rendered
    expect(screen.getByText("📥 Asignar al mazo (1 disp.)")).toBeInTheDocument();
  });

  it("shows 'Añadir a Wants' button for partially-owned cards where missingCount > 0", () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Both Sol Ring (owned 1, missing 1) and Norman (owned 0, missing 1) should have "Añadir a Wants"
    const wantButtons = screen.getAllByRole("button", { name: /Añadir a Wants/i });
    expect(wantButtons.length).toBe(2);
  });

  it("renders card type section header with Total, En colección, and Faltante prices", () => {
    // Pass mock priceSummary in initialDeck
    const deckWithPrices: DeckDetailWithStats = {
      ...mockDeck,
      priceSummary: {
        provider: "cardmarket",
        currency: "EUR",
        currencySymbol: "€",
        totalCards: 2,
        totalNetValue: 15.0,
        totalOwnedValue: 5.0,
        totalMissingValue: 10.0,
        quotes: {
          "sol-scry-id": {
            cardName: "Sol Ring",
            provider: "cardmarket",
            currency: "EUR",
            currencySymbol: "€",
            quantity: 2,
            unitPrice: { trend: 2.5, min: 2.0, max: 3.0 },
            subtotal: 5.0,
            lastUpdated: new Date().toISOString(),
          },
          "norman-scry-id": {
            cardName: "Norman Osborn",
            provider: "cardmarket",
            currency: "EUR",
            currencySymbol: "€",
            quantity: 1,
            unitPrice: { trend: 10.0, min: 9.0, max: 12.0 },
            subtotal: 10.0,
            lastUpdated: new Date().toISOString(),
          },
        },
        lastUpdated: new Date().toISOString(),
      },
    };

    render(<DeckDetailView initialDeck={deckWithPrices} />);

    // Artifacts section header price aria-label
    const artifactSectionPrices = screen.getByLabelText("Valor de Artefactos");
    expect(artifactSectionPrices).toBeInTheDocument();
    expect(artifactSectionPrices).toHaveTextContent("Total: 5.00 €");
    expect(artifactSectionPrices).toHaveTextContent("En colección: 2.50 €");
    expect(artifactSectionPrices).toHaveTextContent("Faltante: 2.50 €");

    // Creatures section header price aria-label
    const creatureSectionPrices = screen.getByLabelText("Valor de Criaturas");
    expect(creatureSectionPrices).toBeInTheDocument();
    expect(creatureSectionPrices).toHaveTextContent("Total: 10.00 €");
    expect(creatureSectionPrices).toHaveTextContent("Faltante: 10.00 €");
  });
});
