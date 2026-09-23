import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DecksPage from "@/app/decks/page";
import { DeckWithCompletion } from "@/lib/schemas";
import * as deckActions from "@/actions/decks";

vi.mock("@/actions/decks", () => ({
  getDecksWithCompletion: vi.fn(),
  deleteDeck: vi.fn().mockResolvedValue({ success: true }),
  archiveDeck: vi.fn().mockResolvedValue({ success: true }),
  updateDeck: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/components/edhrec-recommendations-view", () => ({
  EdhrecRecommendationsView: () => <div data-testid="edhrec-recommendations-view">Mock EDHREC View</div>,
}));

vi.mock("@/components/create-deck-dialog", () => ({
  CreateDeckDialog: () => <button data-testid="create-deck-button">Crear Mazo</button>,
}));

vi.mock("@/components/import-deck-dialog", () => ({
  ImportDeckDialog: () => <button data-testid="import-deck-button">Importar</button>,
}));

describe("DecksPage Tabs Navigation", () => {
  const activeDeck: DeckWithCompletion = {
    id: "active-1",
    userId: "user-1",
    name: "Urza Thopter Foundry",
    format: "Commander",
    description: "Artifact combo deck",
    commander: "Urza, Lord High Artificer",
    commanderScryfallId: "urza-id",
    commanderImageUri: "https://example.com/urza.jpg",
    isCommanderTop100: true,
    commanderEdhrecRank: 7,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 100,
    uniqueCards: 100,
    ownedCards: 80,
    missingCardsCount: 20,
    completionPercentage: 80,
    totalValue: 350.0,
    missingValue: 50.0,
    ownedValue: 300.0,
    currency: "EUR",
    currencySymbol: "€",
  };

  const archivedDeck: DeckWithCompletion = {
    id: "archived-1",
    userId: "user-1",
    name: "Old Krenko Goblins",
    format: "Commander",
    description: "Retired aggressive deck",
    commander: "Krenko, Mob Boss",
    commanderScryfallId: "krenko-id",
    commanderImageUri: null,
    isCommanderTop100: true,
    commanderEdhrecRank: 25,
    isArchived: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 100,
    uniqueCards: 100,
    ownedCards: 60,
    missingCardsCount: 40,
    completionPercentage: 60,
    totalValue: 120.0,
    missingValue: 40.0,
    ownedValue: 80.0,
    currency: "EUR",
    currencySymbol: "€",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the 3 main tabs: Mis mazos, Archivados, and Recomendaciones EDHREC", async () => {
    vi.mocked(deckActions.getDecksWithCompletion).mockResolvedValue([activeDeck, archivedDeck]);

    const ui = await DecksPage();
    render(ui);

    // Verify Tab triggers
    const myDecksTab = screen.getByRole("tab", { name: /Mis mazos/i });
    const archivedTab = screen.getByRole("tab", { name: /Archivados/i });
    const edhrecTab = screen.getByRole("tab", { name: /Recomendaciones EDHREC/i });

    expect(myDecksTab).toBeInTheDocument();
    expect(archivedTab).toBeInTheDocument();
    expect(edhrecTab).toBeInTheDocument();

    // Verify counter badges
    expect(myDecksTab).toHaveTextContent("1"); // 1 active deck
    expect(archivedTab).toHaveTextContent("1"); // 1 archived deck
  });

  it("should calculate KPIs based only on active decks", async () => {
    vi.mocked(deckActions.getDecksWithCompletion).mockResolvedValue([activeDeck, archivedDeck]);

    const ui = await DecksPage();
    render(ui);

    // Total active decks KPI is 1
    expect(screen.getByText("Total de Mazos").nextElementSibling).toHaveTextContent("1");

    // Total Net Value should be based on active deck (350.00 €), not including archived (120 €)
    expect(screen.getAllByText("350.00 €").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("470.00 €")).not.toBeInTheDocument();
  });

  it("should display active deck in Mis mazos and switch to Archivados to see archived deck", async () => {
    vi.mocked(deckActions.getDecksWithCompletion).mockResolvedValue([activeDeck, archivedDeck]);

    const ui = await DecksPage();
    render(ui);

    // Active deck should be visible in active tab
    expect(screen.getByText("Urza Thopter Foundry")).toBeInTheDocument();

    // Switch to Archived tab via Radix onMouseDown
    const archivedTab = screen.getByRole("tab", { name: /Archivados/i });
    fireEvent.mouseDown(archivedTab, { button: 0 });

    // Archived deck should be visible
    expect(screen.getByText("Old Krenko Goblins")).toBeInTheDocument();
    expect(screen.getByText(/Mazos Archivados \(1\)/i)).toBeInTheDocument();
  });

  it("should switch to Recomendaciones EDHREC tab and display EDHREC recommendations view", async () => {
    vi.mocked(deckActions.getDecksWithCompletion).mockResolvedValue([activeDeck]);

    const ui = await DecksPage();
    render(ui);

    const edhrecTab = screen.getByRole("tab", { name: /Recomendaciones EDHREC/i });
    fireEvent.mouseDown(edhrecTab, { button: 0 });

    expect(screen.getByTestId("edhrec-recommendations-view")).toBeInTheDocument();
  });
  it("returns directly to the recommendations tab from a deck preview", async () => {
    vi.mocked(deckActions.getDecksWithCompletion).mockResolvedValue([activeDeck]);
    render(await DecksPage({ searchParams: Promise.resolve({ tab: "edhrec" }) }));
    expect(screen.getByRole("tab", { name: /Recomendaciones EDHREC/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("edhrec-recommendations-view")).toBeInTheDocument();
  });
});
