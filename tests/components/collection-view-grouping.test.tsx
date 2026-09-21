import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionView } from "@/components/collection-view";
import * as collectionActions from "@/actions/collection";
import type {
  CollectionCardDTO,
  CollectionQueryResponse,
} from "@/actions/collection";

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

const sampleCards: CollectionCardDTO[] = [
  {
    id: "c-1",
    userId: "u-1",
    cardScryfallId: "scry-1",
    cardName: "Llanowar Elves",
    quantity: 4,
    typeLine: "Creature — Elf Druid",
    manaCost: "{G}",
    imageUri: "https://example.com/elves.jpg",
  },
  {
    id: "c-2",
    userId: "u-1",
    cardScryfallId: "scry-2",
    cardName: "Forest",
    quantity: 10,
    typeLine: "Basic Land — Forest",
    manaCost: null,
    imageUri: null,
  },
  {
    id: "c-3",
    userId: "u-1",
    cardScryfallId: "scry-3",
    cardName: "Lightning Bolt",
    quantity: 3,
    typeLine: "Instant",
    manaCost: "{R}",
    imageUri: null,
  },
];

function groupedResponse(cards: CollectionCardDTO[] = sampleCards): CollectionQueryResponse {
  return {
    query: "",
    grouped: true,
    provider: "cardmarket",
    currencySymbol: "€",
    totalCards: cards.reduce((s, c) => s + c.quantity, 0),
    uniqueCards: cards.length,
    sections: [
      {
        key: "creatures",
        label: "Criaturas",
        order: 1,
        totalCards: 4,
        uniqueCards: 1,
        ownedCards: 4,
        missingCards: 0,
        completionPercentage: 100,
        sectionTotalPrice: 0,
        sectionMissingPrice: 0,
        sectionOwnedPrice: 0,
        currencySymbol: "€",
        cards: cards.filter((c) => c.cardName === "Llanowar Elves"),
      },
      {
        key: "instants",
        label: "Instantáneos",
        order: 3,
        totalCards: 3,
        uniqueCards: 1,
        ownedCards: 3,
        missingCards: 0,
        completionPercentage: 100,
        sectionTotalPrice: 0,
        sectionMissingPrice: 0,
        sectionOwnedPrice: 0,
        currencySymbol: "€",
        cards: cards.filter((c) => c.cardName === "Lightning Bolt"),
      },
      {
        key: "lands",
        label: "Tierras",
        order: 8,
        totalCards: 10,
        uniqueCards: 1,
        ownedCards: 10,
        missingCards: 0,
        completionPercentage: 100,
        sectionTotalPrice: 0,
        sectionMissingPrice: 0,
        sectionOwnedPrice: 0,
        currencySymbol: "€",
        cards: cards.filter((c) => c.cardName === "Forest"),
      },
    ],
    cards: [],
  };
}

function flatResponse(cards: CollectionCardDTO[]): CollectionQueryResponse {
  return {
    query: "",
    grouped: false,
    provider: "cardmarket",
    currencySymbol: "€",
    totalCards: cards.reduce((s, c) => s + c.quantity, 0),
    uniqueCards: cards.length,
    sections: [],
    cards,
  };
}

describe("CollectionView Backend-Driven Grouping & KPIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(collectionActions.getCollectionQuery).mockImplementation(
      async (opts?: { searchQuery?: string; grouped?: boolean }) => {
        if (opts?.searchQuery) {
          return flatResponse(sampleCards.filter((c) => c.cardName === "Lightning Bolt"));
        }
        return opts?.grouped === false ? flatResponse(sampleCards) : groupedResponse();
      }
    );
  });

  it("should render 3 KPI stats including Mazos count", () => {
    render(
      <CollectionView
        initialView={groupedResponse()}
        initialStats={{ uniqueCards: 3, totalCards: 17, decksCount: 5 }}
      />
    );

    expect(screen.getByText("Únicas")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Copias")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();

    expect(screen.getByText("Mazos")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render category sections computed on the backend", () => {
    render(
      <CollectionView
        initialView={groupedResponse()}
        initialStats={{ uniqueCards: 3, totalCards: 17, decksCount: 2 }}
      />
    );

    expect(screen.getByRole("heading", { name: "Criaturas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Instantáneos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tierras" })).toBeInTheDocument();

    expect(screen.getByText("4 cartas (1 únicas)")).toBeInTheDocument();
    expect(screen.getByText("3 cartas (1 únicas)")).toBeInTheDocument();
    expect(screen.getByText("10 cartas (1 únicas)")).toBeInTheDocument();
  });

  it("should request a backend category grouping when switching to Por Categoría", () => {
    render(
      <CollectionView
        initialView={flatResponse(sampleCards)}
        initialStats={{ uniqueCards: 3, totalCards: 17, decksCount: 2 }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Por Categoría/i }));

    return waitFor(() => {
      expect(collectionActions.getCollectionQuery).toHaveBeenCalledWith(
        expect.objectContaining({ grouped: true })
      );
    });
  });

  it("should filter on the backend when searching by card name", () => {
    render(
      <CollectionView
        initialView={groupedResponse()}
        initialStats={{ uniqueCards: 3, totalCards: 17, decksCount: 2 }}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Filtrar cartas de tu colección por nombre/i);
    fireEvent.change(searchInput, { target: { value: "Bolt" } });

    return waitFor(() => {
      expect(collectionActions.getCollectionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: "Bolt",
          grouped: false,
        })
      );
    });
  });

  it("requests a sort by how many decks ask for the card", () => {
    render(
      <CollectionView
        initialView={flatResponse(sampleCards)}
        initialStats={{ uniqueCards: 3, totalCards: 17, decksCount: 2 }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Se pide en/i }));

    return waitFor(() => {
      expect(collectionActions.getCollectionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: "requested_decks",
          direction: "desc",
        })
      );
    });
  });
});