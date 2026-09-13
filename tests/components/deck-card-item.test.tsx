import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DeckCardItem } from "@/components/deck-card-item";
import { DeckWithCompletion } from "@/lib/schemas";

describe("DeckCardItem Component", () => {
  const baseDeck: DeckWithCompletion = {
    id: "deck-123",
    userId: "user-1",
    name: "Atris Blink",
    format: "Commander",
    description: "Reanimate and blink ETB value",
    commander: "Atris, Oracle of Half-Truths",
    commanderScryfallId: null,
    commanderImageUri: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalCards: 100,
    uniqueCards: 100,
    ownedCards: 75,
    missingCardsCount: 25,
    completionPercentage: 75,
  };

  it("should render deck name, format, and description", () => {
    render(<DeckCardItem deck={baseDeck} />);

    expect(screen.getByText("Atris Blink")).toBeInTheDocument();
    expect(screen.getByText("Commander")).toBeInTheDocument();
    expect(screen.getByText("Reanimate and blink ETB value")).toBeInTheDocument();
  });

  it("should display completion percentage and missing count for incomplete deck", () => {
    render(<DeckCardItem deck={baseDeck} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText(/cartas/i)).toBeInTheDocument();
    expect(screen.getByText(/Faltan 25/i)).toBeInTheDocument();
  });

  it("should display '¡Completado!' badge when all cards are owned", () => {
    const completeDeck: DeckWithCompletion = {
      ...baseDeck,
      ownedCards: 100,
      missingCardsCount: 0,
      completionPercentage: 100,
    };

    render(<DeckCardItem deck={completeDeck} />);

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("¡Completado!")).toBeInTheDocument();
  });

  it("should have link to deck details", () => {
    render(<DeckCardItem deck={baseDeck} />);

    const link = screen.getByRole("link", { name: /Ver Mazo y Faltantes/i });
    expect(link).toHaveAttribute("href", "/decks/deck-123");
  });

  it("should display commander name when deck has an assigned commander", () => {
    render(<DeckCardItem deck={baseDeck} />);

    expect(screen.getAllByText("Atris, Oracle of Half-Truths").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Comandante:/i)).toBeInTheDocument();
  });

  it("should display warning alert when deck has no assigned commander", () => {
    const deckWithoutCommander: DeckWithCompletion = {
      ...baseDeck,
      commander: null,
    };

    render(<DeckCardItem deck={deckWithoutCommander} />);

    expect(screen.getAllByText("Sin comandante asignado").length).toBeGreaterThanOrEqual(1);
  });

  it("should display total, missing and owned value prices when provided", () => {
    const pricedDeck: DeckWithCompletion = {
      ...baseDeck,
      colors: ["W", "U"],
      colorIdentity: "WU",
      totalValue: 125.41,
      missingValue: 30.5,
      ownedValue: 94.91,
      currency: "EUR",
      currencySymbol: "€",
    };

    render(<DeckCardItem deck={pricedDeck} />);

    expect(screen.getByText("125.41 €")).toBeInTheDocument();
    expect(screen.getByText("30.50 €")).toBeInTheDocument();
    expect(screen.getByText("94.91 €")).toBeInTheDocument();
    expect(screen.getByText("Neto Total")).toBeInTheDocument();
    expect(screen.getByText("Faltantes")).toBeInTheDocument();
    expect(screen.getByText("Posesión")).toBeInTheDocument();
    expect(screen.getByText("WU")).toBeInTheDocument();
  });

  it("should derive owned value from total minus missing when not provided", () => {
    const pricedDeck: DeckWithCompletion = {
      ...baseDeck,
      totalValue: 100,
      missingValue: 25,
      currencySymbol: "€",
    };

    render(<DeckCardItem deck={pricedDeck} />);

    expect(screen.getByText("100.00 €")).toBeInTheDocument();
    expect(screen.getByText("25.00 €")).toBeInTheDocument();
    expect(screen.getByText("75.00 €")).toBeInTheDocument();
  });

  it("should not render price when totalValue is missing", () => {
    render(<DeckCardItem deck={baseDeck} />);

    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+\.\d{2} €$/)).not.toBeInTheDocument();
  });

  it("should render medium preview image when commanderImageUri is provided", () => {
    const deckWithImage: DeckWithCompletion = {
      ...baseDeck,
      commanderImageUri: "https://cards.scryfall.io/normal/front/a/t/atris.jpg",
    };

    render(<DeckCardItem deck={deckWithImage} />);

    const images = screen.getAllByRole("img", { name: "Atris, Oracle of Half-Truths" });
    expect(images.length).toBeGreaterThanOrEqual(1);
    expect(images[0]).toHaveAttribute("src", expect.stringContaining("atris.jpg"));
  });

  it("should render fallback placeholder when commanderImageUri is not provided", () => {
    render(<DeckCardItem deck={baseDeck} />);

    const names = screen.getAllByText("Atris, Oracle of Half-Truths");
    expect(names.length).toBe(2);
  });

  it("should open in-app confirmation modal and not call window.confirm when clicking delete", () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<DeckCardItem deck={baseDeck} />);

    const deleteBtn = screen.getByTitle("Eliminar mazo");
    fireEvent.click(deleteBtn);

    // Assert browser confirm was NOT called
    expect(confirmSpy).not.toHaveBeenCalled();

    // Assert in-app modal opened with deck name
    expect(screen.getByText("¿Eliminar mazo permanentemente?")).toBeInTheDocument();
    expect(screen.getAllByText(/Atris Blink/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /^Eliminar mazo$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("should close modal when clicking Cancelar without deleting", () => {
    render(<DeckCardItem deck={baseDeck} />);

    const deleteBtn = screen.getByTitle("Eliminar mazo");
    fireEvent.click(deleteBtn);

    expect(screen.getByText("¿Eliminar mazo permanentemente?")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText("¿Eliminar mazo permanentemente?")).not.toBeInTheDocument();
  });
});
