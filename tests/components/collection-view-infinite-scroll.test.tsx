import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionView } from "@/components/collection-view";
import * as collectionActions from "@/actions/collection";
import type { CollectionCardDTO, CollectionQueryResponse } from "@/actions/collection";

vi.mock("@/actions/pricing", () => ({
  getCollectionPricesLastUpdated: vi.fn().mockResolvedValue("2026-09-06T10:00:00Z"),
  triggerWeeklyCollectionPricing: vi.fn(),
}));

vi.mock("@/actions/collection", () => ({
  addOrIncrementCard: vi.fn(),
  updateCollectionQuantity: vi.fn(),
  deleteCollectionCard: vi.fn(),
  getCollectionQuery: vi.fn(),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ prices: {} }),
}) as any;

function createMockCard(id: number): CollectionCardDTO {
  return {
    id: `card-${id}`,
    userId: "u-1",
    cardScryfallId: `scry-${id}`,
    cardName: `Card Number ${id.toString().padStart(2, "0")}`,
    quantity: 1,
    typeLine: "Creature",
    manaCost: "{1}",
    imageUri: null,
  };
}

function flatResponse(cards: CollectionCardDTO[]): CollectionQueryResponse {
  return {
    query: "",
    grouped: false,
    provider: "cardmarket",
    currencySymbol: "€",
    totalCards: cards.length,
    uniqueCards: cards.length,
    sections: [],
    cards,
  };
}

describe("CollectionView Full-Collection Backend Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectionActions.getCollectionQuery).mockResolvedValue(
      flatResponse([createMockCard(1)])
    );
  });

  it("should render the WHOLE collection from the backend without infinite pagination", () => {
    const allCards = Array.from({ length: 20 }, (_, i) => createMockCard(i + 1));

    render(
      <CollectionView
        initialView={flatResponse(allCards)}
        initialStats={{ uniqueCards: 20, totalCards: 20, decksCount: 1 }}
      />
    );

    // Every card of the whole collection is rendered at once
    for (let i = 1; i <= 20; i++) {
      expect(
        screen.getByText(`Card Number ${i.toString().padStart(2, "0")}`)
      ).toBeInTheDocument();
    }

    // No pagination sentinel / "load more" at all
    expect(screen.queryByTestId("collection-scroll-sentinel")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 - 20 de 20 cartas/i)).toBeInTheDocument();
  });

  it("should paginate collection limiting to 200 cards per page", async () => {
    // 250 cards: Page 1 should show cards 1-200, Page 2 should show cards 201-250
    const allCards = Array.from({ length: 250 }, (_, i) => createMockCard(i + 1));

    render(
      <CollectionView
        initialView={flatResponse(allCards)}
        initialStats={{ uniqueCards: 250, totalCards: 250, decksCount: 1 }}
      />
    );

    // Page 1: Card 1 and Card 200 are visible, Card 201 is not
    expect(screen.getByText("Card Number 01")).toBeInTheDocument();
    expect(screen.getByText("Card Number 200")).toBeInTheDocument();
    expect(screen.queryByText("Card Number 201")).not.toBeInTheDocument();

    // Pagination summary
    expect(screen.getByText(/Mostrando 1 - 200 de 250 cartas/i)).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/i)).toBeInTheDocument();

    // Go to Page 2
    const nextPageBtn = screen.getByRole("button", { name: /Página siguiente/i });
    fireEvent.click(nextPageBtn);

    // Page 2: Card 201 and Card 250 are visible, Card 1 is not
    await waitFor(() => {
      expect(screen.getByText("Card Number 201")).toBeInTheDocument();
      expect(screen.getByText("Card Number 250")).toBeInTheDocument();
      expect(screen.queryByText("Card Number 01")).not.toBeInTheDocument();
      expect(screen.getByText(/Mostrando 201 - 250 de 250 cartas/i)).toBeInTheDocument();
      expect(screen.getByText(/Página 2 de 2/i)).toBeInTheDocument();
    });
  }, 15000);

  it("should request sort on the backend when the sorting bar changes", () => {
    const allCards = Array.from({ length: 3 }, (_, i) => createMockCard(i + 1));

    render(
      <CollectionView
        initialView={flatResponse(allCards)}
        initialStats={{ uniqueCards: 3, totalCards: 3, decksCount: 1 }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Precio \(Unitario\)/i }));

    return waitFor(() => {
      expect(collectionActions.getCollectionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: "price_trend",
          direction: "desc",
        })
      );
    });
  });
});