import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardContextMenu } from "@/components/card-context-menu";
import { DeckTagManagerDialog, GLOBAL_TAGS } from "@/components/deck-tag-manager-dialog";
import { MoxfieldDeckEditor } from "@/components/moxfield-deck-editor";
import type { DeckCardWithOwnership } from "@/lib/schemas";

describe("Deck Editor Improvements", () => {
  const sampleCard: DeckCardWithOwnership = {
    id: "card-1",
    deckId: "deck-100",
    cardScryfallId: "scry-1",
    cardName: "Sol Ring",
    quantity: 1,
    assignedQuantity: 1,
    isSideboard: false,
    manaCost: "{1}",
    typeLine: "Artifact",
    imageUri: "https://cards.scryfall.io/solring.jpg",
    setCode: "cmd",
    ownedInCollection: 1,
    availableToAssign: 0,
    assignedInOtherDecks: [],
    missingCount: 0,
    tags: ["ramp"],
  };

  describe("CardContextMenu", () => {
    it("renders card name and actions when position is provided", () => {
      const onAddOne = vi.fn();
      const onRemove = vi.fn();
      const onToggleSideboard = vi.fn();
      const onChangeTags = vi.fn();

      render(
        <CardContextMenu
          card={sampleCard}
          position={{ x: 100, y: 150 }}
          onClose={vi.fn()}
          onAddOne={onAddOne}
          onRemove={onRemove}
          onToggleSideboard={onToggleSideboard}
          onChangeTags={onChangeTags}
        />
      );

      expect(screen.getByText("Sol Ring")).toBeInTheDocument();
      expect(screen.getByText("Añadir una copia")).toBeInTheDocument();
      expect(screen.getByText("Eliminar copia")).toBeInTheDocument();
      expect(screen.getByText("Mover al Sideboard")).toBeInTheDocument();
      expect(screen.getByText("Cambiar etiquetas")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Añadir una copia"));
      expect(onAddOne).toHaveBeenCalled();

      fireEvent.click(screen.getByText("Mover al Sideboard"));
      expect(onToggleSideboard).toHaveBeenCalled();
    });

    it("displays 'Mover al Mainboard' when card is in sideboard", () => {
      const sideboardCard = { ...sampleCard, isSideboard: true };
      render(
        <CardContextMenu
          card={sideboardCard}
          position={{ x: 100, y: 150 }}
          onClose={vi.fn()}
          onToggleSideboard={vi.fn()}
        />
      );

      expect(screen.getByText("Mover al Mainboard")).toBeInTheDocument();
    });
  });

  describe("DeckTagManagerDialog", () => {
    it("renders global tag chips and current card tags", () => {
      render(
        <DeckTagManagerDialog
          open={true}
          onOpenChange={vi.fn()}
          card={sampleCard}
          allCards={[sampleCard]}
          deckId="deck-100"
          onTagsUpdated={vi.fn()}
        />
      );

      expect(screen.getByText("Etiquetas para Sol Ring")).toBeInTheDocument();
      // Should show global tags chips like ramp, removal, draw
      expect(screen.getAllByText("ramp").length).toBeGreaterThan(0);
      expect(screen.getAllByText("removal").length).toBeGreaterThan(0);
      expect(screen.getAllByText("draw").length).toBeGreaterThan(0);
      expect(screen.getAllByText("boardwipe").length).toBeGreaterThan(0);
    });
  });

  it("filters the editor cards and retains filters and sorting when changing display", () => {
    const cards = [
      {...sampleCard, id:"alpha", cardName:"Alpha", tags:[], missingCount:0},
      {...sampleCard, id:"beta", cardName:"Beta", tags:[], missingCount:1},
      {...sampleCard, id:"gamma", cardName:"Gamma", tags:[], missingCount:1},
    ];
    const {container} = render(<MoxfieldDeckEditor deck={{id:"d1",userId:"u1",name:"Test Deck",format:"Commander",description:null,commander:null,commanderScryfallId:null,commanderImageUri:null,createdAt:new Date(),updatedAt:new Date(),totalCards:3,uniqueCards:3,ownedCards:1,missingCardsCount:2,completionPercentage:33,cards}} cards={cards} priceSummary={null} onCardsUpdated={vi.fn()} />);
    const toolbar = within(screen.getByRole("region", {name:"Opciones del editor de mazos"}));
    expect(container.querySelector("select")).toBeNull();
    fireEvent.click(toolbar.getByRole("button", {name:"Faltantes"}));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    const nameSort = within(toolbar.getByRole("group", {name:"Ordenar por"})).getByRole("button", {name:"Nombre"});
    fireEvent.click(nameSort);
    const gamma = screen.getByText("Gamma");
    const beta = screen.getByText("Beta");
    expect(gamma.compareDocumentPosition(beta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.change(toolbar.getByRole("searchbox", {name:"Buscar carta en el mazo..."}), {target:{value:"Beta"}});
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
    fireEvent.click(toolbar.getByRole("button", {name:"Cuadrícula"}));
    expect(toolbar.getByRole("button", {name:"Faltantes"})).toHaveAttribute("aria-pressed","true");
    expect(toolbar.getByRole("searchbox")).toHaveValue("Beta");
    expect(screen.getByRole("img", {name:"Beta"})).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(toolbar.getByRole("button", {name:/Orden descendente:/})).toBeInTheDocument();
  });

  describe("MoxfieldDeckEditor Tag Grouping", () => {
    it("renders cards with tags under their tag and untagged cards under 'Sin tag'", () => {
      const cardWithTag: DeckCardWithOwnership = {
        ...sampleCard,
        id: "c1",
        cardName: "Arcane Signet",
        tags: ["Ramp"],
      };
      const cardWithoutTag: DeckCardWithOwnership = {
        ...sampleCard,
        id: "c2",
        cardName: "Swords to Plowshares",
        tags: [],
      };

      const sampleDeck: any = {
        id: "d1",
        name: "Test Deck",
        totalCards: 2,
        cards: [cardWithTag, cardWithoutTag],
      };

      render(
        <MoxfieldDeckEditor
          deck={sampleDeck}
          cards={[cardWithTag, cardWithoutTag]}
          priceSummary={null}

          onCardsUpdated={vi.fn()}
        />
      );

      expect(screen.getAllByText("Ramp").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Sin tag")).toBeInTheDocument();
      expect(screen.getByText("Arcane Signet")).toBeInTheDocument();
      expect(screen.getByText("Swords to Plowshares")).toBeInTheDocument();
    });
  });
});
