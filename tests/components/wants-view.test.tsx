import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WantsView } from "@/components/wants-view";
import * as wantActions from "@/actions/wants";
import type { WantCardDTO, WantQueryResponse } from "@/actions/wants";
import * as collectionActions from "@/actions/collection";

vi.mock("@/actions/wants", () => ({
  getWantQuery: vi.fn(),
  addOrIncrementWant: vi.fn(),
  updateWantQuantity: vi.fn(),
  deleteWantCard: vi.fn(),
}));
vi.mock("@/actions/collection", () => ({ addOrIncrementCard: vi.fn() }));

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
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(wantActions.getWantQuery).mockResolvedValue(flatResponse());
  });

  it("moves selected wants optimistically and continues after a card fails", async () => {
    const failedCard = sampleCards[0];
    const successfulCard = sampleCards[1];
    let rejectFirstAdd!: (error: Error) => void;
    vi.mocked(collectionActions.addOrIncrementCard).mockReturnValueOnce(new Promise((_, reject) => { rejectFirstAdd = reject; }));
    vi.mocked(wantActions.getWantQuery).mockResolvedValue(flatResponse([failedCard]));
    render(<WantsView initialView={flatResponse()} initialStats={{ uniqueCards: 2, totalCards: 3 }} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Faeburrow Elder" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Sol Ring" }));
    const tray = screen.getByText("2 seleccionadas").parentElement!;
    expect(tray).toHaveClass("fixed", "bottom-5");
    fireEvent.click(screen.getByRole("button", { name: "Mover a colección" }));
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
    await act(async () => rejectFirstAdd(new Error("collection unavailable")));

    await waitFor(() => expect(screen.getByText(/1 completadas; 1 no se pudieron procesar/i)).toBeInTheDocument());
    expect(wantActions.deleteWantCard).toHaveBeenCalledTimes(1);
    expect(wantActions.deleteWantCard).toHaveBeenCalledWith(successfulCard.id);
    expect(collectionActions.addOrIncrementCard).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Faeburrow Elder").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
  });

  it("lists every want card from the server-rendered payload", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Por Categoría/i }));

    await waitFor(() => {
      expect(wantActions.getWantQuery).toHaveBeenCalled();
    });

    expect(screen.getAllByText("Faeburrow Elder").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sol Ring").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/lista de wants está vacía/i)).not.toBeInTheDocument();
  });
});
