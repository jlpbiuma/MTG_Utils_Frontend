import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeckDetailView } from "@/components/deck-detail-view";
import { DeckDetailWithStats } from "@/lib/schemas";
import * as scryfallActions from "@/actions/scryfall";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/actions/scryfall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/scryfall")>();
  return {
    ...actual,
    getCardDetails: vi.fn(),
  };
});

vi.mock("@/actions/decks", () => ({
  updateDeckCardVersion: vi.fn().mockResolvedValue({ success: true }),
  addCardToDeck: vi.fn(),
  updateDeckCardQuantity: vi.fn(),
  removeCardFromDeck: vi.fn(),
  assignCardToDeck: vi.fn(),
  unassignCardFromDeck: vi.fn(),
  reassignCardToDeck: vi.fn(),
  deleteDeck: vi.fn(),
  addMissingCardsToCollection: vi.fn(),
  setDeckCommander: vi.fn(),
}));

describe("DeckDetailView - Requested In Decks Metric (Missing Priority)", () => {
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
    totalCards: 3,
    uniqueCards: 3,
    ownedCards: 1,
    missingCardsCount: 2,
    completionPercentage: 33,
    cards: [
      {
        id: "card-tidus-commander",
        deckId: "deck-tidus",
        cardScryfallId: "tidus-id",
        cardName: "Tidus, Star Player",
        quantity: 1,
        assignedQuantity: 1,
        isSideboard: false,
        isCommander: true,
        manaCost: "{2}{U}",
        typeLine: "Legendary Creature — Human Hero",
        imageUri: "https://example.com/tidus.jpg",
        ownedInCollection: 1,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 0,
        requestedInDecksCount: 1,
        requestedInDecks: [
          { deckId: "deck-tidus", deckName: "Tidus Blitzball", quantity: 1 },
        ],
      },
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
        requestedInDecksCount: 7,
        requestedInDecks: [
          { deckId: "deck-tidus", deckName: "Tidus Blitzball", quantity: 1 },
          { deckId: "deck-urza", deckName: "Urza Power", quantity: 1 },
          { deckId: "deck-atraxa", deckName: "Atraxa Proliferate", quantity: 1 },
          { deckId: "deck-edgar", deckName: "Edgar Markov", quantity: 1 },
          { deckId: "deck-krenko", deckName: "Krenko Mob", quantity: 1 },
          { deckId: "deck-miirym", deckName: "Miirym Dragons", quantity: 1 },
          { deckId: "deck-lathril", deckName: "Lathril Elves", quantity: 1 },
        ],
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
        ownedInCollection: 1,
        availableToAssign: 0,
        assignedInOtherDecks: [
          { deckId: "deck-urza", deckName: "Urza Power", quantity: 1 },
        ],
        missingCount: 1,
        requestedInDecksCount: 2,
        requestedInDecks: [
          { deckId: "deck-tidus", deckName: "Tidus Blitzball", quantity: 1 },
          { deckId: "deck-urza", deckName: "Urza Power", quantity: 1 },
        ],
      },
    ],
  };

  it("renders 'Se pide en 7 mazos:' with all requesting deck badges for unowned missing card", () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Arcane Signet is missing and requested in 7 decks
    expect(screen.getByText(/Se pide en 7 mazos:/i)).toBeInTheDocument();
    expect(screen.getAllByText("Urza Power (1)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Atraxa Proliferate (1)")).toBeInTheDocument();
    expect(screen.getByText("Edgar Markov (1)")).toBeInTheDocument();
    expect(screen.getByText("(No la tienes en colección)")).toBeInTheDocument();
  });

  it("coexists with '⚠️ Asignada en:' when card is missing in current deck and assigned to another deck", () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Sol Ring is assigned to Urza Power, but missing in Tidus Blitzball
    expect(screen.getByText("⚠️ Asignada en:")).toBeInTheDocument();
    expect(screen.getByText("Reasignar aquí")).toBeInTheDocument();

    // It also shows requested in 2 decks without collision
    expect(screen.getByText(/Se pide en 2 mazos:/i)).toBeInTheDocument();
  });

  it("does not show requested in decks missing badge for fully complete owned card", () => {
    render(<DeckDetailView initialDeck={mockDeck} />);

    // Tidus commander card is owned (missingCount == 0)
    // The "Se pide en 1 mazo:" should NOT be shown in the card row since it's not missing
    const singleDeckBadge = screen.queryByText(/Se pide en 1 mazo:/i);
    expect(singleDeckBadge).toBeNull();
  });

  it("displays requested in decks in CardDetailDialog when opening card info and viewing collection tab", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue({
      id: "signet-id",
      name: "Arcane Signet",
      name_es: "Sello arcano",
      mana_cost: "{2}",
      cmc: 2,
      type_line: "Artifact",
      type_line_es: "Artefacto",
      oracle_text: "{T}: Add one mana...",
      oracle_text_es: "{T}: Agrega un maná...",
      rarity: "common",
      rarity_es: "Común",
      set: "c20",
      set_name: "Commander 2020",
      collector_number: "247",
      has_spanish_print: true,
      printings: [],
      card_faces: [],
      legalities: [],
      prices: {},
    });

    render(<DeckDetailView initialDeck={mockDeck} />);

    // Click on Arcane Signet
    const signetTitle = screen.getByText("Arcane Signet");
    fireEvent.click(signetTitle);

    // Switch to "Mi Colección" tab in modal using mouseDown (Radix Tabs trigger)
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Mi Colección/i })).toBeInTheDocument();
    });
    const collectionTab = screen.getByRole("tab", { name: /Mi Colección/i });
    fireEvent.mouseDown(collectionTab);

    // In modal, check that the requested in decks info is rendered
    await waitFor(() => {
      const modalElements = screen.getAllByText(/Se pide en 7 mazos:/i);
      expect(modalElements.length).toBe(2); // One in deck list, one in dialog
    });
  });
});
