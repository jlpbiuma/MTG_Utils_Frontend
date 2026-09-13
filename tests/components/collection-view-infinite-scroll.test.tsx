import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionView } from "@/components/collection-view";
import * as collectionActions from "@/actions/collection";

vi.mock("@/actions/pricing", () => ({
  getCollectionPricesLastUpdated: vi.fn().mockResolvedValue("2026-09-06T10:00:00Z"),
  triggerWeeklyCollectionPricing: vi.fn(),
}));

vi.mock("@/actions/collection", () => ({
  addOrIncrementCard: vi.fn(),
  updateCollectionQuantity: vi.fn(),
  deleteCollectionCard: vi.fn(),
  getUserCollection: vi.fn(),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ prices: {} }),
}) as any;

function createMockCard(id: number) {
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

describe("CollectionView Infinite Scroll & Partial 9-Card Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initially render 9 cards and show the load more sentinel when more cards exist", () => {
    const first9Cards = Array.from({ length: 9 }, (_, i) => createMockCard(i + 1));

    render(
      <CollectionView
        initialCards={first9Cards}
        initialStats={{
          uniqueCards: 20,
          totalCards: 20,
          decksCount: 1,
        }}
      />
    );

    // Should render all 9 initial cards
    for (let i = 1; i <= 9; i++) {
      expect(
        screen.getByText(`Card Number ${i.toString().padStart(2, "0")}`)
      ).toBeInTheDocument();
    }

    // Should display the scroll sentinel with button
    expect(screen.getByTestId("collection-scroll-sentinel")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cargar más cartas \(9 de 20\)/i })
    ).toBeInTheDocument();
  });

  it("should fetch the next 9 cards with correct limit and offset when loading more", async () => {
    const first9Cards = Array.from({ length: 9 }, (_, i) => createMockCard(i + 1));
    const nextBatch = Array.from({ length: 9 }, (_, i) => createMockCard(i + 10));

    vi.mocked(collectionActions.getUserCollection).mockResolvedValueOnce(nextBatch);

    render(
      <CollectionView
        initialCards={first9Cards}
        initialStats={{
          uniqueCards: 25,
          totalCards: 25,
          decksCount: 1,
        }}
      />
    );

    const loadMoreBtn = screen.getByRole("button", {
      name: /Cargar más cartas \(9 de 25\)/i,
    });
    fireEvent.click(loadMoreBtn);

    // Verify getUserCollection was called with offset 9 and limit 9
    await waitFor(() => {
      expect(collectionActions.getUserCollection).toHaveBeenCalledWith({
        searchQuery: undefined,
        limit: 9,
        offset: 9,
      });
    });

    // Verify newly fetched cards appear in the DOM
    await waitFor(() => {
      expect(screen.getByText("Card Number 10")).toBeInTheDocument();
      expect(screen.getByText("Card Number 18")).toBeInTheDocument();
    });
  });

  it("should stop showing sentinel and show end message when all cards have been loaded", async () => {
    const first9Cards = Array.from({ length: 9 }, (_, i) => createMockCard(i + 1));
    // Next batch only has 3 cards (finishing a collection of 12)
    const finalBatch = [createMockCard(10), createMockCard(11), createMockCard(12)];

    vi.mocked(collectionActions.getUserCollection).mockResolvedValueOnce(finalBatch);

    render(
      <CollectionView
        initialCards={first9Cards}
        initialStats={{
          uniqueCards: 12,
          totalCards: 12,
          decksCount: 1,
        }}
      />
    );

    const loadMoreBtn = screen.getByRole("button", {
      name: /Cargar más cartas \(9 de 12\)/i,
    });
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Has cargado todas las cartas de tu colección \(12 únicas\)/i)
      ).toBeInTheDocument();
    });

    // Sentinel should be gone since hasMore is now false
    expect(screen.queryByTestId("collection-scroll-sentinel")).not.toBeInTheDocument();
  });
});
