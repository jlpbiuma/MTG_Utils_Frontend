import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SelectCommanderDialog, truncateTypeLine } from "@/components/select-commander-dialog";
import { DeckCardWithOwnership } from "@/lib/schemas";

// Mock server action
vi.mock("@/actions/decks", () => ({
  setDeckCommander: vi.fn().mockResolvedValue({
    commander: "Niv-Mizzet, Parun",
    commanderScryfallId: "mock-id-1",
    commanderImageUri: "https://example.com/niv.jpg",
  }),
}));

vi.mock("@/actions/scryfall", () => ({
  getCardNamed: vi.fn().mockImplementation(async (name: string) => {
    const isDihada = name === "Dihada, Binder of Wills";
    return {
      id: `resolved-${name}`,
      name,
      type_line: isDihada ? "Legendary Planeswalker — Dihada" : "Legendary Creature",
      oracle_text: isDihada
        ? "Dihada, Binder of Wills can be your commander."
        : name === "Niv-Mizzet, Parun"
          ? "Partner"
          : "",
      image_uris: { normal: `https://example.com/${name}.jpg` },
      ...(name === "Niv-Mizzet, Parun"
        ? {
            card_faces: [
              { image_uris: { normal: "https://example.com/front.jpg" } },
              { image_uris: { normal: "https://example.com/back.jpg" } },
            ],
          }
        : {}),
    };
  }),
}));

import { DoubleFacePreview } from "@/components/select-commander-dialog";

describe("SelectCommanderDialog Component", () => {
  const mockCards: DeckCardWithOwnership[] = [
    {
      id: "card-1",
      deckId: "deck-1",
      cardScryfallId: "scry-1",
      cardName: "Niv-Mizzet, Parun",
      quantity: 1,
      assignedQuantity: 1,
      isSideboard: false,
      isCommander: false,
      manaCost: "{U}{U}{U}{R}{R}{R}",
      typeLine: "Legendary Creature — Dragon Wizard",
      imageUri: "https://example.com/niv.jpg",
      ownedInCollection: 1,
      availableToAssign: 0,
      assignedInOtherDecks: [],
      missingCount: 0,
    },
    {
      id: "card-2",
      deckId: "deck-1",
      cardScryfallId: "scry-2",
      cardName: "Guttersnipe",
      quantity: 1,
      assignedQuantity: 1,
      isSideboard: false,
      isCommander: false,
      manaCost: "{2}{R}",
      typeLine: "Creature — Goblin Shaman",
      imageUri: "https://example.com/gutter.jpg",
      ownedInCollection: 1,
      availableToAssign: 0,
      assignedInOtherDecks: [],
      missingCount: 0,
    },
    {
      id: "card-3",
      deckId: "deck-1",
      cardScryfallId: "scry-3",
      cardName: "Counterspell",
      quantity: 1,
      assignedQuantity: 1,
      isSideboard: false,
      isCommander: false,
      manaCost: "{U}{U}",
      typeLine: "Instant",
      imageUri: null,
      ownedInCollection: 1,
      availableToAssign: 0,
      assignedInOtherDecks: [],
      missingCount: 0,
    },
  ];

  it("should render dialog title and exclude non-legendary creatures", () => {
    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={mockCards}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    expect(screen.getByText("Asignar Comandante al Mazo")).toBeInTheDocument();
    expect(screen.getByText("Niv-Mizzet, Parun")).toBeInTheDocument();
    // Non-legendary creatures and non-creatures should not be candidates.
    expect(screen.queryByText("Guttersnipe")).not.toBeInTheDocument();
    expect(screen.queryByText("Counterspell")).not.toBeInTheDocument();
  });

  it("should display 'Legendaria' badge for legendary creatures", () => {
    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={mockCards}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    expect(screen.getByText("Legendaria")).toBeInTheDocument();
  });

  it("should only list legendary creatures and legendary Vehicles as commander candidates", () => {
    const candidates = [
      mockCards[0],
      { ...mockCards[1], id: "vehicle", cardName: "Skysovereign, Consul Flagship", typeLine: "Legendary Artifact — Vehicle" },
      { ...mockCards[1], id: "artifact", cardName: "The Mightstone and Weakstone", typeLine: "Legendary Artifact" },
      { ...mockCards[1], id: "sorcery", cardName: "Yawgmoth's Vile Offering", typeLine: "Legendary Sorcery" },
      { ...mockCards[1], id: "instant", cardName: "Urza's Ruinous Blast", typeLine: "Legendary Instant" },
      { ...mockCards[1], id: "creature", cardName: "Guttersnipe", typeLine: "Creature — Goblin Shaman" },
    ];

    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={candidates}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    expect(screen.getByText("Niv-Mizzet, Parun")).toBeInTheDocument();
    expect(screen.getByText("Skysovereign, Consul Flagship")).toBeInTheDocument();
    expect(screen.queryByText("The Mightstone and Weakstone")).not.toBeInTheDocument();
    expect(screen.queryByText("Yawgmoth's Vile Offering")).not.toBeInTheDocument();
    expect(screen.queryByText("Urza's Ruinous Blast")).not.toBeInTheDocument();
    expect(screen.queryByText("Guttersnipe")).not.toBeInTheDocument();
  });

  it("should list a legendary planeswalker the API flags as a commander candidate", async () => {
    const dihada = {
      ...mockCards[1],
      id: "card-dihada",
      cardScryfallId: "scry-dihada",
      cardName: "Dihada, Binder of Wills",
      typeLine: "Legendary Planeswalker — Dihada",
      imageUri: "https://example.com/dihada.jpg",
      // Server says her oracle text authorizes her as commander.
      canBeCommander: true,
    };
    const narset = {
      ...mockCards[1],
      id: "card-narset",
      cardScryfallId: "scry-narset",
      cardName: "Narset, Enlightened Master",
      typeLine: "Legendary Planeswalker — Narset",
      imageUri: "https://example.com/narset.jpg",
      canBeCommander: false,
    };

    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={[dihada, narset]}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    // "Dihada, Binder of Wills" (es: "Dihada, Doblegadora de Voluntades"),
    // flagged by the backend, must appear as a candidate even though she is a
    // planeswalker (not a creature nor a vehicle).
    expect(screen.getByText("Dihada, Binder of Wills")).toBeInTheDocument();
    // A planeswalker the API does not authorize must be excluded.
    expect(screen.queryByText("Narset, Enlightened Master")).not.toBeInTheDocument();
  });

  it("should list a commander planeswalker only once even when present as several deck rows", () => {
    const commanderRow = {
      ...mockCards[1],
      id: "card-dihada-commander",
      cardScryfallId: "scry-commander",
      cardName: "Dihada, Binder of Wills",
      typeLine: "Legendary Planeswalker — Dihada",
      imageUri: "https://example.com/dihada-commander.jpg",
      isCommander: true,
      canBeCommander: true,
    };
    const mainboardCopy = {
      ...mockCards[1],
      id: "card-dihada-copy",
      cardScryfallId: "scry-copy",
      cardName: "Dihada, Binder of Wills",
      typeLine: "Legendary Planeswalker — Dihada",
      imageUri: "https://example.com/dihada-copy.jpg",
      isCommander: false,
      canBeCommander: true,
    };
    const sideboardCopy = {
      ...mockCards[1],
      id: "card-dihada-sideboard",
      cardScryfallId: "scry-sideboard",
      cardName: "Dihada, Binder of Wills",
      typeLine: "Legendary Planeswalker — Dihada",
      imageUri: "https://example.com/dihada-sideboard.jpg",
      isSideboard: true,
      isCommander: false,
      canBeCommander: true,
    };

    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={[commanderRow, sideboardCopy, mainboardCopy]}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    expect(screen.getAllByText("Dihada, Binder of Wills")).toHaveLength(1);
  });

  it("should truncate a long card type", () => {
    const longTypeLine = "Legendary Creature — Human Wizard Warrior // Legendary Enchantment Creature — Human Wizard Warrior";
    const transformCard = {
      ...mockCards[0],
      id: "transform-card",
      cardName: "Terra, Magical Adept",
      typeLine: longTypeLine,
    };

    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={[transformCard]}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    expect(truncateTypeLine(longTypeLine)).toBe("Legendary Creature — Human Wizard Warrior…");

    const typeLine = screen.getByTitle(longTypeLine);
    expect(typeLine).toHaveClass("w-0", "min-w-0", "flex-1", "truncate");
    expect(typeLine).toHaveTextContent("Legendary Creature — Human Wizard Warrior…");
  });

  it("should allow typing a custom commander name", () => {
    render(
      <SelectCommanderDialog
        deckId="deck-1"
        deckName="Izzet Spells"
        open={true}
        onOpenChange={vi.fn()}
        deckCards={mockCards}
        currentCommander={null}
        onCommanderSelected={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/ej: Niv-Mizzet, Parun/i);
    fireEvent.change(input, { target: { value: "Kaza, Roil Chaser" } });

    expect(input).toHaveValue("Kaza, Roil Chaser");
  });

  it("should render a two-face preview when the transform icon is hovered", async () => {
    render(
      <DoubleFacePreview faces={["https://example.com/front.jpg", "https://example.com/back.jpg"]} />
    );

    fireEvent.mouseEnter(screen.getByTitle("Carta transformable: ver ambas caras"));

    await waitFor(() => {
      expect(screen.getByAltText("Cara 1")).toBeInTheDocument();
      expect(screen.getByAltText("Cara 2")).toBeInTheDocument();
    });
  });
});
