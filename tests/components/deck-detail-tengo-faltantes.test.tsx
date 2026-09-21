import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeckDetailView } from "@/components/deck-detail-view";
import { DeckDetailWithStats } from "@/lib/schemas";
import * as deckActions from "@/actions/decks";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/actions/decks", () => ({
  addMissingCardsToCollection: vi.fn().mockResolvedValue({ success: true, addedCount: 2 }),
  addMissingCardToCollection: vi.fn().mockResolvedValue({ success: true, addedCount: 1 }),
  updateDeckCardVersion: vi.fn().mockResolvedValue({ success: true }),
  addCardToDeck: vi.fn(),
  updateDeckCardQuantity: vi.fn(),
  removeCardFromDeck: vi.fn(),
  assignCardToDeck: vi.fn(),
  unassignCardFromDeck: vi.fn(),
  reassignCardToDeck: vi.fn(),
  deleteDeck: vi.fn(),
  setDeckCommander: vi.fn(),
}));

describe("DeckDetailView - 'Tengo las faltantes' functionality end-to-end", () => {
  const mockDeck: DeckDetailWithStats = {
    id: "deck-tidus",
    userId: "user-1",
    name: "Tidus Blitzball",
    format: "Commander",
    description: "Water magic",
    commander: "Tidus, Star Player",
    commanderScryfallId: "tidus-id",
    commanderImageUri: "https://example.com/tidus.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 2,
    uniqueCards: 2,
    ownedCards: 0,
    missingCardsCount: 2,
    completionPercentage: 0,
    cards: [
      {
        id: "card-arcane-signet",
        deckId: "deck-tidus",
        cardScryfallId: "signet-id",
        cardName: "Arcane Signet",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: "{2}",
        typeLine: "Artifact",
        imageUri: "https://example.com/signet.jpg",
        ownedInCollection: 0,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 1,
      },
      {
        id: "card-sol-ring",
        deckId: "deck-tidus",
        cardScryfallId: "sol-ring-id",
        cardName: "Sol Ring",
        quantity: 1,
        assignedQuantity: 0,
        isSideboard: false,
        isCommander: false,
        manaCost: "{1}",
        typeLine: "Artifact",
        imageUri: "https://example.com/solring.jpg",
        ownedInCollection: 0,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 1,
      },
    ],
  };

  it("updates individual card to owned and assigned when clicking per-card 'Tengo las faltantes'", async () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Check initial state: 2 missing cards, 0%
    expect(screen.getByText("Faltan 2 cartas")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();

    // Two per-card buttons are present
    const singleButtons = screen.getAllByTitle("Añadir automáticamente las copias faltantes a tu colección física");
    expect(singleButtons.length).toBe(2);

    // Click on Arcane Signet's "Tengo las faltantes"
    fireEvent.click(singleButtons[0]);

    // Should call addMissingCardToCollection
    await waitFor(() => {
      expect(deckActions.addMissingCardToCollection).toHaveBeenCalledWith(
        "deck-tidus",
        "card-arcane-signet"
      );
    });

    // Optimistic UI updates immediately:
    // Arcane Signet shows "Tienes 1 de 1"
    await waitFor(() => {
      expect(screen.getByText("Tienes 1 de 1")).toBeInTheDocument();
      expect(screen.getByText("🎯 Asignada (1/1)")).toBeInTheDocument();
    });

    // Header stats update to 1 missing card, 50%
    expect(screen.getByText("Faltan 1 cartas")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("updates all missing cards to owned and assigned when clicking bulk 'Tengo las faltantes' in header", async () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    const bulkButton = screen.getByTitle("Añade todas las cartas faltantes de este mazo a tu inventario físico");
    expect(bulkButton).toBeInTheDocument();

    fireEvent.click(bulkButton);

    await waitFor(() => {
      expect(deckActions.addMissingCardsToCollection).toHaveBeenCalledWith("deck-tidus");
    });

    // All cards become complete, header shows 100% en mano
    await waitFor(() => {
      expect(screen.getByText("100% en mano")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    // Both cards now have checkmarks
    expect(screen.getAllByText("Tienes 1 de 1").length).toBe(2);
    expect(screen.getAllByText("🎯 Asignada (1/1)").length).toBe(2);

    // Bulk button disappears because missingCardsCount is 0
    expect(
      screen.queryByTitle("Añade todas las cartas faltantes de este mazo a tu inventario físico")
    ).toBeNull();
  });
});
