import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DeckListView } from "@/components/deck-list-view";
import { DeckWithCompletion } from "@/lib/schemas";

function makeDeck(overrides: Partial<DeckWithCompletion>): DeckWithCompletion {
  return {
    id: "deck-1",
    userId: "user-1",
    name: "Azorius Blink",
    format: "Commander",
    description: null,
    commander: "Brago, King Eternal",
    commanderScryfallId: null,
    commanderImageUri: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 100,
    uniqueCards: 100,
    ownedCards: 50,
    missingCardsCount: 50,
    completionPercentage: 50,
    ...overrides,
  };
}

const azorius = makeDeck({
  id: "d1",
  name: "Azorius Blink",
  commander: "Brago, King Eternal",
  colors: ["W", "U"],
  colorIdentity: "WU",
  totalValue: 120.5,
  missingValue: 10.25,
  completionPercentage: 90,
});

const jund = makeDeck({
  id: "d2",
  name: "Jund Sacrifice",
  commander: "Korvold, Fae-Cursed King",
  colors: ["B", "R", "G"],
  colorIdentity: "BRG",
  totalValue: 400,
  missingValue: 150,
  completionPercentage: 40,
});

const monoBlue = makeDeck({
  id: "d3",
  name: "Pauper Blue",
  commander: "Minn, Wily Illusionist",
  colors: ["U"],
  colorIdentity: "U",
  totalValue: 25.99,
  missingValue: 0,
  completionPercentage: 100,
});

const noColors = makeDeck({
  id: "d4",
  name: "Spirit Tokens",
  commander: null,
  colors: undefined,
  colorIdentity: undefined,
  totalValue: 60,
  completionPercentage: 75,
});

function flatTitles(): string[] {
  return screen
    .getAllByRole("heading", { level: 3 })
    .map((n) => n.textContent || "");
}

describe("DeckListView", () => {
  it("renders all decks by default in flat continuous grid sorted by completion descending", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue, noColors]} />);

    expect(screen.queryByRole("region", { name: "Azorius" })).not.toBeInTheDocument();
    expect(flatTitles()).toEqual([
      "Pauper Blue", // 100%
      "Azorius Blink", // 90%
      "Spirit Tokens", // 75%
      "Jund Sacrifice", // 40%
    ]);
  });

  it("filters the list to complete or incomplete decks", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue, noColors]} />);

    fireEvent.click(screen.getByRole("button", { name: "Completos" }));
    expect(flatTitles()).toEqual(["Pauper Blue"]);

    fireEvent.click(screen.getByRole("button", { name: "Incompletos" }));
    expect(flatTitles()).toEqual(["Azorius Blink", "Spirit Tokens", "Jund Sacrifice"]);
  });

  it("groups decks by color identity when 'Por Colores' is toggled", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue, noColors]} />);

    fireEvent.click(screen.getByRole("button", { name: /Por Colores/i }));

    expect(
      within(screen.getByRole("region", { name: "Azorius" })).getByText("Azorius Blink")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Jund" })).getByText("Jund Sacrifice")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Mono-Azul" })).getByText("Pauper Blue")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Sin Colores" })).getByText("Spirit Tokens")
    ).toBeInTheDocument();
  });

  it("filters decks by deck name", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue]} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Buscar mazo por nombre o por comandante/i),
      { target: { value: "pauper" } }
    );

    expect(screen.getByText("Pauper Blue")).toBeInTheDocument();
    expect(screen.queryByText("Azorius Blink")).not.toBeInTheDocument();
    expect(screen.queryByText("Jund Sacrifice")).not.toBeInTheDocument();
  });

  it("filters decks by commander name", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue]} />);

    fireEvent.change(
      screen.getByPlaceholderText(/Buscar mazo por nombre o por comandante/i),
      { target: { value: "korvold" } }
    );

    expect(screen.getByText("Jund Sacrifice")).toBeInTheDocument();
    expect(screen.queryByText("Pauper Blue")).not.toBeInTheDocument();
  });

  it("sorts by price (descending by default) in flat grid", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue, noColors]} />);

    fireEvent.click(screen.getByRole("button", { name: /^Precio$/ }));

    expect(flatTitles()).toEqual([
      "Jund Sacrifice", // 400
      "Azorius Blink", // 120.5
      "Spirit Tokens", // 60
      "Pauper Blue", // 25.99
    ]);
  });

  it("sorts by missing price (descending by default, nulls last)", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue, noColors]} />);

    fireEvent.click(screen.getByRole("button", { name: /^Precio Faltante$/ }));

    expect(flatTitles()).toEqual([
      "Jund Sacrifice", // 150
      "Azorius Blink", // 10.25
      "Pauper Blue", // 0
      "Spirit Tokens", // null → last
    ]);
  });

  it("sorts by completion percentage (descending by default)", () => {
    render(<DeckListView decks={[azorius, jund, monoBlue]} />);

    expect(flatTitles()).toEqual([
      "Pauper Blue", // 100%
      "Azorius Blink", // 90%
      "Jund Sacrifice", // 40%
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Completitud/i }));
    expect(flatTitles()).toEqual([
      "Jund Sacrifice", // 40%
      "Azorius Blink", // 90%
      "Pauper Blue", // 100%
    ]);
  });

  it("switches between flat grid and grouped by color", () => {
    render(<DeckListView decks={[azorius, jund]} />);

    expect(screen.queryByRole("region", { name: "Azorius" })).not.toBeInTheDocument();
    expect(screen.getByText("Azorius Blink")).toBeInTheDocument();
    expect(screen.getByText("Jund Sacrifice")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Por Colores/i }));
    expect(screen.getByRole("region", { name: "Azorius" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cuadrícula/i }));
    expect(screen.queryByRole("region", { name: "Azorius" })).not.toBeInTheDocument();
  });
});