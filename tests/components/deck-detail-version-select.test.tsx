import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeckDetailView } from "@/components/deck-detail-view";
import { DeckDetailWithStats } from "@/lib/schemas";
import * as scryfallActions from "@/actions/scryfall";
import * as deckActions from "@/actions/decks";

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

vi.mock("@/actions/collection", () => ({
  updateCollectionCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/wants", () => ({
  updateWantCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

describe("DeckDetailView Version Selection & Stability", () => {
  const terraPrintings: scryfallActions.CardPrintingDetail[] = [
    {
      id: "terra-v1",
      set_code: "fic",
      set_name: "Final Fantasy VI",
      collector_number: "2",
      rarity: "mythic",
      image_uri: "https://example.com/terra-v1.jpg",
      image_uri_large: "https://example.com/terra-v1-large.jpg",
      image_uri_small: "https://example.com/terra-v1-small.jpg",
      trend: 15.0,
    },
    {
      id: "terra-v2",
      set_code: "fic",
      set_name: "Final Fantasy VI Showcase",
      collector_number: "202",
      rarity: "mythic",
      image_uri: "https://example.com/terra-v2.jpg",
      image_uri_large: "https://example.com/terra-v2-large.jpg",
      image_uri_small: "https://example.com/terra-v2-small.jpg",
      trend: 45.0,
    },
  ];

  const terraDetails: scryfallActions.SpanishCardDetails = {
    id: "terra-v1",
    name: "Terra, Herald of Hope",
    name_es: "Terra, heraldo de la esperanza",
    mana_cost: "{1}{W}{U}{B}",
    cmc: 4,
    type_line: "Legendary Creature — Human Esper",
    type_line_es: "Criatura legendaria — Esper humano",
    oracle_text: "Flying...",
    oracle_text_es: "Vuela...",
    rarity: "mythic",
    rarity_es: "Rara mítica",
    set: "fic",
    set_name: "Final Fantasy VI",
    collector_number: "2",
    has_spanish_print: true,
    printings: terraPrintings,
    card_faces: [],
    legalities: [],
    prices: {},
  };

  const initialDeck: DeckDetailWithStats = {
    id: "deck-terra",
    userId: "user-1",
    name: "FFVI: Terra Herald of Hope",
    format: "Commander",
    description: "Esper magic",
    commander: "Terra, Herald of Hope",
    commanderScryfallId: "terra-v1",
    commanderImageUri: "https://example.com/terra-v1.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 1,
    uniqueCards: 1,
    ownedCards: 1,
    missingCardsCount: 0,
    completionPercentage: 100,
    cards: [
      {
        id: "card-row-1",
        deckId: "deck-terra",
        cardScryfallId: "terra-v1",
        cardName: "Terra, Herald of Hope",
        quantity: 1,
        assignedQuantity: 1,
        isSideboard: false,
        isCommander: true,
        manaCost: "{1}{W}{U}{B}",
        typeLine: "Legendary Creature — Human Esper",
        imageUri: "https://example.com/terra-v1.jpg",
        ownedInCollection: 1,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 0,
        canBeCommander: true,
      },
    ],
  };

  it("updates the card version and does not glitch or revert when another version is selected", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(terraDetails);

    render(<DeckDetailView initialDeck={initialDeck} />);

    // Click to open card details modal from commander header or card row
    const cardTitles = screen.getAllByText("Terra, Herald of Hope");
    expect(cardTitles.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(cardTitles[0]);

    // Modal opens and shows versions tab
    await waitFor(() => {
      expect(screen.getByText("Final Fantasy VI Showcase")).toBeInTheDocument();
    });

    expect(scryfallActions.getCardDetails).toHaveBeenCalledTimes(1);

    // Click the showcase version
    const showcaseButton = screen.getByText("Final Fantasy VI Showcase").closest("button");
    expect(showcaseButton).toBeInTheDocument();
    fireEvent.click(showcaseButton!);

    // Calls updateDeckCardVersion with new scryfall ID and image
    await waitFor(() => {
      expect(deckActions.updateDeckCardVersion).toHaveBeenCalledWith("deck-terra", "card-row-1", {
        cardScryfallId: "terra-v2",
        imageUri: "https://example.com/terra-v2.jpg",
        setCode: "fic",
        isCommander: true,
      });
    });

    // The modal must not re-fetch or revert
    expect(scryfallActions.getCardDetails).toHaveBeenCalledTimes(1);

    // The feedback badge shows it's selected as standard
    expect(screen.getByText(/seleccionada como estándar del mazo/i)).toBeInTheDocument();
  });
});
