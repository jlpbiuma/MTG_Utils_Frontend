import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionView } from "@/components/collection-view";
import * as collectionActions from "@/actions/collection";
import type { CollectionCardDTO, CollectionQueryResponse } from "@/actions/collection";

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

  it("asks the backend for each page and shows totals of the whole filtered collection", async () => {
    // 250 cards in the account, 120 per page: the server returns one page at a time.
    const allCards = Array.from({ length: 250 }, (_, i) => createMockCard(i + 1));
    const page = (n: number): CollectionQueryResponse => ({
      ...flatResponse(allCards.slice((n - 1) * 120, n * 120)),
      totalCards: 250,
      uniqueCards: 250,
      page: n,
      limit: 120,
      hasMore: n * 120 < 250,
    });
    vi.mocked(collectionActions.getCollectionQuery).mockImplementation(async (options) => page(options?.page ?? 1));

    render(
      <CollectionView
        initialView={page(1)}
        initialStats={{ uniqueCards: 250, totalCards: 250, decksCount: 1 }}
      />
    );

    expect(screen.getByText("Card Number 01")).toBeInTheDocument();
    expect(screen.getByText("Card Number 120")).toBeInTheDocument();
    expect(screen.queryByText("Card Number 121")).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 - 120 de 250 cartas/i)).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Página siguiente/i }));

    await waitFor(() => {
      expect(screen.getByText("Card Number 121")).toBeInTheDocument();
      expect(screen.queryByText("Card Number 01")).not.toBeInTheDocument();
      expect(screen.getByText(/Mostrando 121 - 240 de 250 cartas/i)).toBeInTheDocument();
      expect(screen.getByText(/Página 2 de 3/i)).toBeInTheDocument();
    });
    expect(collectionActions.getCollectionQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, limit: 120, grouped: false })
    );
  }, 15000);

  it("keeps the same page size when grouping, and sends price filters to the backend", async () => {
    render(
      <CollectionView
        initialView={flatResponse([createMockCard(1)])}
        initialStats={{ uniqueCards: 1, totalCards: 1, decksCount: 1 }}
      />
    );

    fireEvent.change(screen.getAllByPlaceholderText(/mín/i)[0], { target: { value: "2" } });

    await waitFor(() => {
      expect(collectionActions.getCollectionQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ minPrice: 2, page: 1, limit: 120 })
      );
    }, { timeout: 2000 });
  });

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