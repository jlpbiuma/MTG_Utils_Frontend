import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { GoldenWantsTab } from "@/components/golden-wants-tab";
import { addOrIncrementWant } from "@/actions/wants";
import { copyText } from "@/lib/copy-text";
import type { PriorityItem } from "@/actions/priorities";

vi.mock("@/actions/wants", () => ({ addOrIncrementWant: vi.fn() }));
vi.mock("@/lib/copy-text", () => ({ copyText: vi.fn() }));

describe("GoldenWantsTab Component", () => {
  beforeEach(() => {
    vi.mocked(addOrIncrementWant).mockReset().mockResolvedValue({});
    vi.mocked(copyText).mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const sampleItems: PriorityItem[] = [
    // 4 cards for a deck at 20% (80 missing cards)
    ...[1, 2, 3, 4].map((i) => ({
      cardName: `Eldrazi Spell ${i}`,
      cardScryfallId: `es-${i}`,
      imageUri: null,
      manaCost: "{4}",
      typeLine: "Creature",
      numDecks: 1,
      decks: [
        {
          deckId: "eldrazis-cascade",
          deckName: "Eldrazis Cascade",
          completionPercentage: 20.0,
          colors: ["C"],
          requestedQuantity: 1,
          assignedQuantity: 0,
          missingQuantity: 1,
          deckCardId: `dc-es-${i}`,
          deckTotalCards: 100,
          deckMissingCards: 80,
        },
      ],
      copiesOwned: 0,
      copiesNeeded: 1,
      deficit: 1,
      price: 2.0,
      totalDeficitCost: 2.0,
      isReassignable: false,
      reassignOptions: [],
      maxDeckCompletion: 20.0,
    })),
    // 1 card for a deck at 99% (1 missing card)
    {
      cardName: "Last Piece",
      cardScryfallId: "lp-1",
      imageUri: null,
      manaCost: "{1}",
      typeLine: "Artifact",
      numDecks: 1,
      decks: [
        {
          deckId: "deck-finishable",
          deckName: "Almost Finished Deck",
          completionPercentage: 99.0,
          colors: ["U"],
          requestedQuantity: 1,
          assignedQuantity: 0,
          missingQuantity: 1,
          deckCardId: "dc-lp",
          deckTotalCards: 100,
          deckMissingCards: 1,
        },
      ],
      copiesOwned: 0,
      copiesNeeded: 1,
      deficit: 1,
      price: 1.0,
      totalDeficitCost: 1.0,
      isReassignable: false,
      reassignOptions: [],
      maxDeckCompletion: 99.0,
    },
  ];

  it("renders optimizer controls and Cerrar Mazos al 100% strategy", () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} currencySymbol="€" />);

    expect(screen.getByText("Golden Wants")).toBeInTheDocument();
    expect(screen.getByText("¿Cuánto quieres invertir hoy?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar Mazos al 100%" })).toBeInTheDocument();
    expect(screen.getByText("Max % Global")).toBeInTheDocument();
  });

  it("displays accurate completion progress and only marks truly completed decks as 100%", () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} currencySymbol="€" />);

    // Budget default is 50€.
    // "Almost Finished Deck" needs 1 card (1.00€). It completes to 100%!
    // "Eldrazis Cascade" needs 80 cards. Only 4 are in candidates. It must NOT reach 100%!

    // Check trophy banner: exactly 1 deck reaches 100%, NOT Eldrazis Cascade!
    expect(screen.getByText(/¡1 mazo alcanzará el 100% de cartas en mano!/)).toBeInTheDocument();
    expect(screen.getAllByText("Almost Finished Deck").length).toBeGreaterThanOrEqual(1);

    // Check Eldrazis Cascade progress: +4 cards of 80 missing (NOT of 4 missing!)
    expect(screen.getByText("+4 cartas añadidas de 80 faltantes")).toBeInTheDocument();
    expect(screen.getByText("24%")).toBeInTheDocument();

    // Check Finishable Deck progress: +1 card of 1 missing
    expect(screen.getByText("+1 cartas añadidas de 1 faltantes")).toBeInTheDocument();

    // Mazos completables badge should show 1
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("alcanzarían el 100%")).toBeInTheDocument();
  });

  it("allows switching strategies and updating budget", () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} currencySymbol="€" />);

    // Click Max % Global button
    const maxGlobalBtn = screen.getByText("Max % Global").closest("button");
    expect(maxGlobalBtn).toBeInTheDocument();
    fireEvent.click(maxGlobalBtn!);

    // Change budget to 2€
    const budgetInput = screen.getByRole("spinbutton");
    fireEvent.change(budgetInput, { target: { value: "2" } });

    // With 2€ budget, total cost is <= 2€
    expect(screen.getByText("Gasto Proyectado")).toBeInTheDocument();
  });
  it.each(["Cerrar Mazos al 100%", "Max % Global"])("only shows improved decks with %s", (strategy) => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} currencySymbol="€" />);
    fireEvent.click(screen.getByRole("button", { name: strategy }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
    expect(screen.getByRole("button", { name: "Cartas que mejoran Almost Finished Deck" })).toBeInTheDocument();
    expect(screen.queryByText("Eldrazis Cascade")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0.5" } });
    expect(screen.queryByText("Impacto Proyectado en tus Mazos")).not.toBeInTheDocument();
  });

  it("shows one line per selected card with type, mana and price for the focused deck", async () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} currencySymbol="$" />);
    fireEvent.focus(screen.getByRole("button", { name: "Cartas que mejoran Eldrazis Cascade" }));
    const tooltip = await screen.findByRole("tooltip");
    const rows = within(tooltip).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    rows.forEach((row, index) => {
      expect(within(row).getByText(`Eldrazi Spell ${index + 1}`)).toBeInTheDocument();
      expect(row).toHaveTextContent("Creature");
      expect(within(row).getByLabelText("Coste de maná: {4}")).toBeInTheDocument();
      expect(row).toHaveTextContent("2.00 $");
    });
    expect(within(tooltip).queryByText("Last Piece")).not.toBeInTheDocument();
  });

  it("filters price opportunities before optimization and updates projected impact", () => {
    const opportunities = sampleItems.map((item, index) => ({
      ...item,
      historicalLow: index === 0 ? 2 : null,
      atHistoricalLow: index === 0,
      change30dPercent: index === 4 ? -20 : null,
    }));
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={opportunities} currencySymbol="€" />);
    fireEvent.click(screen.getByRole("checkbox", { name: "En mínimo histórico" }));
    expect(screen.getByText("1x Eldrazi Spell 1")).toBeInTheDocument();
    expect(screen.queryByText("1x Last Piece")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cartas que mejoran Almost Finished Deck" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "En mínimo histórico" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "En tendencia a la baja" }));
    expect(screen.getByText("1x Last Piece")).toBeInTheDocument();
    expect(screen.queryByText("1x Eldrazi Spell 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Max % Global" }));
    expect(screen.getByText("1x Last Piece")).toBeInTheDocument();
  });

  it("includes unchanged decks in the global metric and preserves baseline with zero budget", () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} globalDeckCount={4} globalCompletionBefore={70} />);
    expect(screen.getByText("+1.25 pp")).toBeInTheDocument();
    expect(screen.getByText(/70.00% → 71.25% · media de 4 mazos/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0" } });
    expect(screen.getByText("+0.00 pp")).toBeInTheDocument();
  });

  it("uses the selected period's signals after refreshed props arrive", () => {
    const { rerender } = render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "En tendencia a la baja" }));
    expect(screen.queryByText("1x Last Piece")).not.toBeInTheDocument();
    rerender(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} priceWindowDays={7} items={sampleItems.map((item) => ({ ...item, priceChangePercent: -10 }))} />);
    expect(screen.getByLabelText("Período de precios")).toHaveValue("7");
    expect(screen.getByText("1x Last Piece")).toBeInTheDocument();
    expect(screen.getAllByText("7D").length).toBeGreaterThan(0);
  });

  it("copies every selected card as quantity and name, one per line", async () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar Lista en Texto" }));
    expect(copyText).toHaveBeenCalledWith("1 Eldrazi Spell 1\n1 Eldrazi Spell 2\n1 Eldrazi Spell 3\n1 Eldrazi Spell 4\n1 Last Piece");
    expect(await screen.findByText("¡Copiada al portapapeles!")).toBeInTheDocument();
  });

  it("shows manual copy without claiming success when clipboard fails", async () => {
    vi.mocked(copyText).mockRejectedValueOnce(new Error("Denied"));
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar Lista en Texto" }));
    expect(await screen.findByRole("textbox")).toHaveValue("1 Eldrazi Spell 1\n1 Eldrazi Spell 2\n1 Eldrazi Spell 3\n1 Eldrazi Spell 4\n1 Last Piece");
    expect(screen.queryByText("¡Copiada al portapapeles!")).not.toBeInTheDocument();
  });

  it("adds individual cards and skips them during bulk addition, retrying only failures", async () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir Last Piece a Wants" }));
    await screen.findByText("1 cartas añadidas a Wants.");
    expect(addOrIncrementWant).toHaveBeenCalledWith(expect.objectContaining({ cardScryfallId: "lp-1", quantity: 1 }));
    vi.mocked(addOrIncrementWant).mockRejectedValueOnce(new Error("Offline"));
    fireEvent.click(screen.getByRole("button", { name: "Añadir todas a Wants" }));
    await screen.findByText(/3 añadidas; 1 no se pudieron añadir/);
    expect(addOrIncrementWant).toHaveBeenCalledTimes(5);
    fireEvent.click(screen.getByRole("button", { name: "Añadir todas a Wants" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Añadir todas a Wants" })).toBeDisabled());
    expect(addOrIncrementWant).toHaveBeenCalledTimes(6);
    expect(vi.mocked(addOrIncrementWant).mock.calls[5][0].cardScryfallId).toBe("es-1");
  });

  it("omits a card from optimization, copy and Wants, and restores it", async () => {
    render(<GoldenWantsTab onDecksSelect={vi.fn()} onCardSelect={vi.fn()} items={sampleItems} />);
    fireEvent.click(screen.getByRole("button", { name: "Omitir Last Piece" }));
    expect(screen.queryByRole("button", { name: "Ver detalles de Last Piece" })).not.toBeInTheDocument();
    expect(screen.queryByText(/¡1 mazo alcanzará/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar Lista en Texto" }));
    expect(vi.mocked(copyText).mock.calls[0][0]).not.toContain("Last Piece");
    fireEvent.click(screen.getByRole("button", { name: "Añadir todas a Wants" }));
    await screen.findByText("4 cartas añadidas a Wants.");
    expect(addOrIncrementWant).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar omitidas (1)" }));
    expect(screen.getByRole("button", { name: "Ver detalles de Last Piece" })).toBeInTheDocument();
  });

});
