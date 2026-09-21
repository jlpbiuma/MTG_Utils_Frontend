import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeckCardItem } from "@/components/deck-card-item";
import { DeckListView } from "@/components/deck-list-view";
import { DeckWithCompletion } from "@/lib/schemas";
import * as deckActions from "@/actions/decks";

vi.mock("@/actions/decks", () => ({
  deleteDeck: vi.fn().mockResolvedValue({ success: true }),
  archiveDeck: vi.fn().mockResolvedValue({ success: true }),
  updateDeck: vi.fn().mockResolvedValue({}),
}));

describe("Deck Archiving", () => {
  const baseDeck: DeckWithCompletion = {
    id: "deck-123",
    userId: "user-1",
    name: "Atris Blink",
    format: "Commander",
    description: "Reanimate and blink ETB value",
    commander: "Atris, Oracle of Half-Truths",
    commanderScryfallId: null,
    commanderImageUri: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 100,
    uniqueCards: 100,
    ownedCards: 75,
    missingCardsCount: 25,
    completionPercentage: 75,
  };

  it("should show 'Archivar mazo' button when deck is active and toggle archive status", async () => {
    const archiveSpy = vi.spyOn(deckActions, "archiveDeck");
    render(<DeckCardItem deck={baseDeck} />);

    const archiveBtn = screen.getByTitle("Archivar mazo");
    expect(archiveBtn).toBeInTheDocument();
    expect(screen.queryByText("Archivado")).not.toBeInTheDocument();

    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(archiveSpy).toHaveBeenCalledWith("deck-123", true);
      expect(screen.getByText("Archivado")).toBeInTheDocument();
      expect(screen.getByTitle("Desarchivar mazo")).toBeInTheDocument();
    });
  });

  it("should show 'Archivado' badge and 'Desarchivar mazo' button when deck is already archived", async () => {
    const archivedDeck: DeckWithCompletion = {
      ...baseDeck,
      id: "deck-456",
      isArchived: true,
    };
    const archiveSpy = vi.spyOn(deckActions, "archiveDeck");
    render(<DeckCardItem deck={archivedDeck} />);

    expect(screen.getByText("Archivado")).toBeInTheDocument();
    const unarchiveBtn = screen.getByTitle("Desarchivar mazo");
    expect(unarchiveBtn).toBeInTheDocument();

    fireEvent.click(unarchiveBtn);

    await waitFor(() => {
      expect(archiveSpy).toHaveBeenCalledWith("deck-456", false);
      expect(screen.queryByText("Archivado")).not.toBeInTheDocument();
      expect(screen.getByTitle("Archivar mazo")).toBeInTheDocument();
    });
  });

  it("should render informative empty state when isArchivedView is true and no decks exist", () => {
    render(<DeckListView decks={[]} isArchivedView={true} />);

    expect(screen.getByText("No tienes ningún mazo archivado")).toBeInTheDocument();
    expect(
      screen.getByText(/Los mazos archivados se guardan aquí. No cuentan para los cálculos de completitud ni para las métricas de valor faltante o total./i)
    ).toBeInTheDocument();
  });
});
