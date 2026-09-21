import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { PrioritiesView } from "@/components/priorities-view";
import type { PrioritiesResponse, PriorityItem } from "@/actions/priorities";

// Mock actions
vi.mock("@/actions/priorities", () => ({
  getPriorities: vi.fn(),
  reassignCardBetweenDecks: vi.fn(),
}));

vi.mock("@/actions/wants", () => ({
  addOrIncrementWant: vi.fn(),
}));

// Mock CardDetailDialog to verify it receives the cheapest reprint scryfallId
vi.mock("@/components/card-detail-dialog", () => ({
  CardDetailDialog: vi.fn(({ isOpen, cardId, cardName, onOpenChange }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-card-detail-dialog">
        <span data-testid="dialog-card-name">{cardName}</span>
        <span data-testid="dialog-card-id">{cardId}</span>
        <button onClick={() => onOpenChange?.(false)}>Cerrar Dialog</button>
      </div>
    );
  }),
}));

const sampleItem: PriorityItem = {
  cardName: "Sol Ring",
  cardScryfallId: "sol-ring-cheapest-reprint-uuid",
  imageUri: "https://images.example.com/sol-ring-cheapest.jpg",
  manaCost: "{1}",
  typeLine: "Artifact",
  cardType: "Artefactos",
  numDecks: 2,
  decks: [
    {
      deckId: "deck-1",
      deckName: "Urza Lord High",
      completionPercentage: 85.0,
      colors: ["U"],
      requestedQuantity: 1,
      assignedQuantity: 0,
      missingQuantity: 1,
      deckCardId: "dc-1",
      potentialGain: 1.2,
    },
    {
      deckId: "deck-2",
      deckName: "Meren Reanimator",
      completionPercentage: 90.0,
      colors: ["B", "G"],
      requestedQuantity: 1,
      assignedQuantity: 0,
      missingQuantity: 1,
      deckCardId: "dc-2",
      potentialGain: 1.1,
    },
  ],
  copiesOwned: 0,
  copiesNeeded: 2,
  deficit: 2,
  price: 1.15,
  totalDeficitCost: 2.3,
  isReassignable: false,
  reassignOptions: [],
  maxDeckCompletion: 90.0,
  maxPotentialGain: 1.2,
  avgPotentialGain: 1.15,
  netCompletionGain: 2.3,
  sumPointsGain: 2.3,
};

const samplePrioritiesResponse: PrioritiesResponse = {
  items: [sampleItem],
  totalUniqueCards: 1,
  totalDeficitCopies: 2,
  totalDeficitCost: 2.3,
  provider: "cardmarket",
  currencySymbol: "€",
  page: 1,
  limit: 30,
  hasMore: false,
};

describe("PrioritiesView - Card Detail & Cheapest Reprint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens CardDetailDialog with the cheapest reprint when clicking card name in Table view", async () => {
    render(<PrioritiesView initialData={samplePrioritiesResponse} />);

    // Dialog should not be open initially
    expect(screen.queryByTestId("mock-card-detail-dialog")).toBeNull();

    // Click the card name button in table (first element with title "Ver detalles de Sol Ring")
    const cardElements = screen.getAllByTitle("Ver detalles de Sol Ring");
    expect(cardElements.length).toBeGreaterThan(0);
    fireEvent.click(cardElements[0]);

    // Dialog must open
    expect(screen.getByTestId("mock-card-detail-dialog")).toBeDefined();
    expect(screen.getByTestId("dialog-card-name").textContent).toBe("Sol Ring");
    // Verify it passes the cheapest reprint ID, not an arbitrary deck ID
    expect(screen.getByTestId("dialog-card-id").textContent).toBe(
      "sol-ring-cheapest-reprint-uuid"
    );

    // Close dialog
    fireEvent.click(screen.getByText("Cerrar Dialog"));
    expect(screen.queryByTestId("mock-card-detail-dialog")).toBeNull();
  });

  it("opens CardDetailDialog when clicking card thumbnail or Eye action button in Table view", async () => {
    render(<PrioritiesView initialData={samplePrioritiesResponse} />);

    // Click the Eye detail button
    const eyeBtns = screen.getAllByTitle(/ver detalles/i);
    expect(eyeBtns.length).toBeGreaterThan(0);
    fireEvent.click(eyeBtns[0]);

    expect(screen.getByTestId("mock-card-detail-dialog")).toBeDefined();
    expect(screen.getByTestId("dialog-card-id").textContent).toBe(
      "sol-ring-cheapest-reprint-uuid"
    );
  });

  it("opens CardDetailDialog when in Grid view mode", async () => {
    render(<PrioritiesView initialData={samplePrioritiesResponse} />);

    // Switch to Grid View
    const gridToggleBtn = screen.getByTitle("Vista en cuadrícula");
    fireEvent.click(gridToggleBtn);

    // In grid view, click on card image or title
    const cardElements = screen.getAllByTitle("Ver detalles de Sol Ring");
    expect(cardElements.length).toBeGreaterThan(0);
    fireEvent.click(cardElements[0]);

    expect(screen.getByTestId("mock-card-detail-dialog")).toBeDefined();
    expect(screen.getByTestId("dialog-card-id").textContent).toBe(
      "sol-ring-cheapest-reprint-uuid"
    );
  });

  it("adds exactly 1 copy to wants when clicking the add to wants button regardless of deficit", async () => {
    const { addOrIncrementWant } = await import("@/actions/wants");
    render(<PrioritiesView initialData={samplePrioritiesResponse} />);

    // In sampleItem, deficit is 2
    expect(sampleItem.deficit).toBe(2);

    const wantBtn = screen.getByTitle("Añadir a lista de deseos (Wants)");
    fireEvent.click(wantBtn);

    expect(addOrIncrementWant).toHaveBeenCalledWith(
      expect.objectContaining({
        cardScryfallId: "sol-ring-cheapest-reprint-uuid",
        cardName: "Sol Ring",
        quantity: 1,
      })
    );
  });
});
