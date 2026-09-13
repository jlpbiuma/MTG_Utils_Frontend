import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import * as deckActions from "@/actions/decks";

vi.mock("@/actions/decks", () => ({
  updateDeck: vi.fn(),
  setDeckCommander: vi.fn(),
}));

describe("EditDeckDialog Component", () => {
  const initialDeck = {
    id: "deck-xyz-123",
    name: "Kaalia Tribal",
    format: "Commander / EDH",
    description: "Angels and Demons combo",
    commander: "Kaalia of the Vast",
  };

  const deckCards = [
    { cardName: "Kaalia of the Vast", typeLine: "Legendary Creature — Human Cleric" },
    { cardName: "Avacyn, Angel of Hope", typeLine: "Legendary Creature — Angel" },
    { cardName: "Sol Ring", typeLine: "Artifact" },
  ];

  it("should pre-populate form with existing deck data", async () => {
    render(<EditDeckDialog deck={initialDeck} deckCards={deckCards} />);

    // Click trigger to open modal
    const editBtn = screen.getByRole("button", { name: /editar/i });
    fireEvent.click(editBtn);

    expect(screen.getByText("Editar Mazo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kaalia Tribal")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Kaalia of the Vast")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Angels and Demons combo")).toBeInTheDocument();
  });

  it("should call updateDeck with modified name and commander on submit", async () => {
    const onUpdatedMock = vi.fn();
    vi.mocked(deckActions.updateDeck).mockResolvedValueOnce({
      id: "deck-xyz-123",
      userId: "user-1",
      name: "Kaalia Updated",
      format: "Commander / EDH",
      description: "Angels and Demons combo",
      commander: "Avacyn, Angel of Hope",
      commanderScryfallId: null,
      commanderImageUri: "https://cards.scryfall.io/avacyn.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
      totalCards: 100,
      uniqueCards: 100,
      ownedCards: 90,
      missingCardsCount: 10,
      completionPercentage: 90,
    });

    render(<EditDeckDialog deck={initialDeck} deckCards={deckCards} onUpdated={onUpdatedMock} />);

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    // Modify name
    const nameInput = screen.getByDisplayValue("Kaalia Tribal");
    fireEvent.change(nameInput, { target: { value: "Kaalia Updated" } });

    // Modify commander
    const commanderInput = screen.getByDisplayValue("Kaalia of the Vast");
    fireEvent.change(commanderInput, { target: { value: "Avacyn, Angel of Hope" } });

    // Submit form
    const saveBtn = screen.getByRole("button", { name: /guardar cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(deckActions.updateDeck).toHaveBeenCalledWith("deck-xyz-123", {
        name: "Kaalia Updated",
        format: "Commander / EDH",
        description: "Angels and Demons combo",
        commander: "Avacyn, Angel of Hope",
      });
      expect(onUpdatedMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Kaalia Updated",
          commander: "Avacyn, Angel of Hope",
        })
      );
    });
  });
});
