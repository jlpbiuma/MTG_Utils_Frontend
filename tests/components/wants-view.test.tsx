import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WantsView } from "@/components/wants-view";
import * as wantActions from "@/actions/wants";
import type { WantCardDTO, WantQueryResponse } from "@/actions/wants";

vi.mock("@/actions/wants", () => ({
  getWantQuery: vi.fn(),
  addOrIncrementWant: vi.fn(),
  updateWantQuantity: vi.fn(),
  deleteWantCard: vi.fn(),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ summary: null }),
}) as unknown as typeof fetch;

const sampleCards: WantCardDTO[] = [
  {
    id: "w-1",
    userId: "u-1",
    cardScryfallId: "scry-1",
    cardName: "Faeburrow Elder",
    quantity: 1,
    typeLine: "Creature — Treefolk Druid",
    manaCost: "{1}{G}{W}",
    imageUri: null,
    requestedInDecks: [
      { deckId: "deck-2", deckName: "Tidus Voltron", quantity: 1 },
    ],
    requestedInDecksCount: 1,
  },
  {
    id: "w-2",
    userId: "u-1",
    cardScryfallId: "scry-2",
    cardName: "Sol Ring",
    quantity: 2,
    typeLine: "Artifact",
    manaCost: "{1}",
    imageUri: null,
    requestedInDecks: [],
    requestedInDecksCount: 0,
  },
];

function flatResponse(cards: WantCardDTO[] = sampleCards): WantQueryResponse {
  return {
    query: "",
    grouped: false,
    provider: "cardmarket",
    currencySymbol: "€",
    totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
    uniqueCards: cards.length,
    sections: [],
    cards,
  };
}

describe("WantsView listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(wantActions.getWantQuery).mockResolvedValue(flatResponse());
  });

  it("lists every want card by name", async () => {
    render(
      <WantsView
        initialView={flatResponse()}
        initialStats={{ uniqueCards: 2, totalCards: 3, decksCount: 4 }}
      />
    );

    expect(screen.getByRole("heading", { name: "Wants" })).toBeInTheDocument();
    expect(screen.getAllByText("Faeburrow Elder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sol Ring").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/lista de wants está vacía/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(wantActions.getWantQuery).toHaveBeenCalled();
    });
    expect(screen.getAllByText("Faeburrow Elder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sol Ring").length).toBeGreaterThanOrEqual(1);
  });

  it("shows which decks request a wanted card", () => {
    render(
      <WantsView
        initialView={flatResponse()}
        initialStats={{ uniqueCards: 2, totalCards: 3 }}
      />
    );

    expect(screen.getByRole("link", { name: /En mazo: Tidus Voltron/i })).toBeInTheDocument();
  });

  it("collapses multiple requesting decks behind modal button", () => {
    const crowded = flatResponse([
      {
        ...sampleCards[0],
        requestedInDecks: [
          { deckId: "d1", deckName: "Atraxa", quantity: 1 },
          { deckId: "d2", deckName: "Tidus", quantity: 1 },
          { deckId: "d3", deckName: "Y'shtola", quantity: 1 },
        ],
        requestedInDecksCount: 36,
      },
    ]);

    render(
      <WantsView
        initialView={crowded}
        initialStats={{ uniqueCards: 1, totalCards: 1 }}
      />
    );

    expect(screen.getByRole("button", { name: /En 36 mazos/i })).toBeInTheDocument();
    expect(screen.queryByText("Y'shtola")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /En 36 mazos/i }));
    expect(screen.getByText("Y'shtola")).toBeInTheDocument();
  });

  it("keeps the listing when the refetch fails", async () => {
    vi.mocked(wantActions.getWantQuery).mockRejectedValue(new Error("backend down"));

    render(
      <WantsView
        initialView={flatResponse()}
        initialStats={{ uniqueCards: 2, totalCards: 3 }}
      />
    );

    await waitFor(() => {
      expect(wantActions.getWantQuery).toHaveBeenCalled();
    });

    expect(screen.getAllByText("Faeburrow Elder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sol Ring").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/lista de wants está vacía/i)).not.toBeInTheDocument();
  });
});
