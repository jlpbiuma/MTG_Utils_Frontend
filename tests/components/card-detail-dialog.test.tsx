import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import * as scryfallActions from "@/actions/scryfall";
import * as deckActions from "@/actions/decks";
import * as collectionActions from "@/actions/collection";
import * as wantActions from "@/actions/wants";

vi.mock("@/actions/scryfall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/scryfall")>();
  return {
    ...actual,
    getCardDetails: vi.fn(),
  };
});

vi.mock("@/actions/decks", () => ({
  updateDeckCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/collection", () => ({
  updateCollectionCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/actions/wants", () => ({
  updateWantCardVersion: vi.fn().mockResolvedValue({ success: true }),
}));

describe("CardDetailDialog Component (Spanish MTG Details)", () => {
  const singleFacedCard: scryfallActions.SpanishCardDetails = {
    id: "bolt-123",
    name: "Lightning Bolt",
    name_es: "Relámpago",
    mana_cost: "{R}",
    cmc: 1,
    type_line: "Instant",
    type_line_es: "Instantáneo",
    oracle_text: "Lightning Bolt deals 3 damage to any target.",
    oracle_text_es: "El Relámpago hace 3 puntos de daño a cualquier objetivo.",
    flavor_text: "A bolt from the blue.",
    flavor_text_es: "Un rayo en cielo sereno.",
    power: undefined,
    toughness: undefined,
    rarity: "uncommon",
    rarity_es: "Infrecuente",
    set: "M10",
    set_name: "Magic 2010",
    collector_number: "146",
    artist: "Christopher Moeller",
    has_spanish_print: true,
    image_uris: {
      normal: "https://example.com/bolt.jpg",
    },
    printings: [
      {
        id: "bolt-123",
        set_code: "m10",
        set_name: "Magic 2010",
        collector_number: "146",
        rarity: "uncommon",
        image_uri: "https://example.com/bolt-m10.jpg",
        image_uri_small: "https://example.com/bolt-m10-small.jpg",
        image_uri_large: "https://example.com/bolt-m10-large.jpg",
        trend: 2.1,
      },
      {
        id: "bolt-2ba",
        set_code: "2ba",
        set_name: "Masters 25",
        collector_number: "77",
        rarity: "uncommon",
        image_uri: "https://example.com/bolt-2ba.jpg",
        image_uri_small: "https://example.com/bolt-2ba-small.jpg",
        image_uri_large: "https://example.com/bolt-2ba-large.jpg",
        trend: 2.5,
      },
    ],
    card_faces: [],
    legalities: [
      { format: "commander", format_name: "Commander / EDH", status: "legal", status_es: "Legal" },
      { format: "modern", format_name: "Modern", status: "legal", status_es: "Legal" },
      { format: "standard", format_name: "Estándar", status: "not_legal", status_es: "No legal" },
    ],
    prices: {
      eur: "2.10",
      eur_foil: "5.50",
      usd: "0.85",
      usd_foil: "4.00",
    },
  };

  const doubleFacedCard: scryfallActions.SpanishCardDetails = {
    id: "delver-456",
    name: "Delver of Secrets // Insectile Aberration",
    name_es: "Hurgador de secretos // Aberración insectil",
    mana_cost: "{U}",
    cmc: 1,
    type_line: "Creature — Human Wizard // Creature — Human Insect",
    type_line_es: "Criatura — Hechicero humano // Criatura — Insecto humano",
    oracle_text: "At the beginning of your upkeep...",
    oracle_text_es: "Al comienzo de tu mantenimiento...",
    rarity: "uncommon",
    rarity_es: "Infrecuente",
    set: "ISD",
    set_name: "Innistrad",
    collector_number: "51",
    artist: "Nils Hamm",
    has_spanish_print: true,
    card_faces: [
      {
        name: "Delver of Secrets",
        name_es: "Hurgador de secretos",
        mana_cost: "{U}",
        type_line: "Creature — Human Wizard",
        type_line_es: "Criatura — Hechicero humano",
        oracle_text_es: "Al comienzo de tu mantenimiento, mira la primera carta de tu biblioteca.",
        power: "1",
        toughness: "1",
        image_uris: { normal: "https://example.com/delver-front.jpg" },
      },
      {
        name: "Insectile Aberration",
        name_es: "Aberración insectil",
        mana_cost: undefined,
        type_line: "Creature — Human Insect",
        type_line_es: "Criatura — Insecto humano",
        oracle_text_es: "Vuela.",
        power: "3",
        toughness: "2",
        image_uris: { normal: "https://example.com/delver-back.jpg" },
      },
    ],
    legalities: [
      { format: "commander", format_name: "Commander / EDH", status: "legal", status_es: "Legal" },
      { format: "modern", format_name: "Modern", status: "not_legal", status_es: "No legal" },
    ],
    prices: { eur: "1.20" },
  };

  it("should render complete card details in Spanish with Versiones as the default tab", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(singleFacedCard);

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Lightning Bolt"
        cardId="bolt-123"
        quantity={4}
        ownedInCollection={4}
      />
    );

    // Header & Names
    await waitFor(() => {
      expect(screen.getByText("Relámpago")).toBeInTheDocument();
    });
    expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
    expect(screen.getByText("Oficial ES")).toBeInTheDocument();

    // Type line & rules in Spanish
    expect(screen.getByText("Instantáneo")).toBeInTheDocument();
    expect(
      screen.getByText(/El Relámpago hace 3 puntos de daño a cualquier objetivo/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/«Un rayo en cielo sereno.»/i)).toBeInTheDocument();

    // Versiones tab is active by default with thumbnails visible
    expect(screen.getByText("Masters 25")).toBeInTheDocument();
    expect(screen.getByText("#77")).toBeInTheDocument();
    expect(screen.getByText("Estándar en mazo")).toBeInTheDocument();

    // Switch to Legalidades tab
    const legalitiesTab = screen.getByRole("tab", { name: /Legalidad/i });
    fireEvent.mouseDown(legalitiesTab);

    // Legalities in Spanish
    await waitFor(() => {
      expect(screen.getByText("Commander / EDH")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Legal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Estándar")).toBeInTheDocument();
    expect(screen.getByText("No legal")).toBeInTheDocument();
  });

  it("should automatically select clicked version as standard and call onVersionSelect", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(singleFacedCard);
    const onVersionSelect = vi.fn();

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Lightning Bolt"
        cardId="bolt-123"
        deckId="deck-abc"
        deckCardId="dc-123"
        onVersionSelect={onVersionSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Masters 25")).toBeInTheDocument();
    });

    // Click on Masters 25 version
    const masters25Button = screen.getByText("Masters 25").closest("button");
    expect(masters25Button).toBeInTheDocument();
    fireEvent.click(masters25Button!);

    // Should call updateDeckCardVersion action
    await waitFor(() => {
      expect(deckActions.updateDeckCardVersion).toHaveBeenCalledWith("deck-abc", "dc-123", {
        cardScryfallId: "bolt-2ba",
        imageUri: "https://example.com/bolt-2ba.jpg",
        setCode: "2ba",
        isCommander: undefined,
      });
    });

    // Should call onVersionSelect callback
    expect(onVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bolt-2ba", set_code: "2ba" })
    );

    // Feedback displayed
    expect(
      screen.getByText(/seleccionada como estándar del mazo/i)
    ).toBeInTheDocument();
  });

  it("persists collection version when collectionCardId is provided", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(singleFacedCard);
    const onVersionSelect = vi.fn();

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Lightning Bolt"
        cardId="bolt-123"
        collectionCardId="col-99"
        onVersionSelect={onVersionSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Masters 25")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Masters 25").closest("button")!);

    await waitFor(() => {
      expect(collectionActions.updateCollectionCardVersion).toHaveBeenCalledWith("col-99", {
        cardScryfallId: "bolt-2ba",
        imageUri: "https://example.com/bolt-2ba.jpg",
        setCode: "2ba",
        collectorNumber: expect.anything(),
      });
    });

    expect(onVersionSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bolt-2ba" })
    );
    expect(
      screen.getByText(/seleccionada como estándar de la colección/i)
    ).toBeInTheDocument();
  });

  it("persists want version when wantCardId is provided", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(singleFacedCard);

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Lightning Bolt"
        cardId="bolt-123"
        wantCardId="want-55"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Masters 25")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Masters 25").closest("button")!);

    await waitFor(() => {
      expect(wantActions.updateWantCardVersion).toHaveBeenCalledWith("want-55", {
        cardScryfallId: "bolt-2ba",
        imageUri: "https://example.com/bolt-2ba.jpg",
        setCode: "2ba",
        collectorNumber: expect.anything(),
      });
    });

    expect(
      screen.getByText(/seleccionada como estándar del want/i)
    ).toBeInTheDocument();
  });

  it("should toggle faces for double-faced cards (Transform / MDFC)", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(doubleFacedCard);

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Delver of Secrets // Insectile Aberration"
        cardId="delver-456"
      />
    );

    // Front face
    await waitFor(() => {
      expect(screen.getByText("Hurgador de secretos")).toBeInTheDocument();
    });
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(
      screen.getByText(/Al comienzo de tu mantenimiento, mira la primera carta/i)
    ).toBeInTheDocument();

    // Flip face button
    const flipButton = screen.getByRole("button", { name: /Girar cara/i });
    expect(flipButton).toBeInTheDocument();

    // Click flip face
    fireEvent.click(flipButton);

    // Back face
    expect(screen.getByText("Aberración insectil")).toBeInTheDocument();
    expect(screen.getByText("3/2")).toBeInTheDocument();
    expect(screen.getByText("Vuela.")).toBeInTheDocument();
  });

  it("should keep selected version and image active without glitching or reverting to initial version", async () => {
    vi.mocked(scryfallActions.getCardDetails).mockResolvedValue(singleFacedCard);
    const onVersionSelect = vi.fn();

    render(
      <CardDetailDialog
        isOpen={true}
        cardName="Lightning Bolt"
        cardId="bolt-123"
        imageUri="https://example.com/bolt-m10.jpg"
        deckId="deck-abc"
        deckCardId="dc-123"
        onVersionSelect={onVersionSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Masters 25")).toBeInTheDocument();
    });

    // Initial getCardDetails called once
    expect(scryfallActions.getCardDetails).toHaveBeenCalledTimes(1);

    // Main preview initially displays m10 image
    const mainImage = screen.getByRole("img", { name: "Relámpago" });
    expect(mainImage).toHaveAttribute("src", expect.stringContaining("bolt-m10"));

    // Click Masters 25 version
    const masters25Button = screen.getByText("Masters 25").closest("button");
    expect(masters25Button).toBeInTheDocument();
    fireEvent.click(masters25Button!);

    // Should immediately switch to the new version's image
    await waitFor(() => {
      expect(mainImage).toHaveAttribute("src", expect.stringContaining("bolt-2ba"));
    });

    // Crucial: getCardDetails must not have been called a second time
    expect(scryfallActions.getCardDetails).toHaveBeenCalledTimes(1);

    // Image stays on the selected version and does not revert
    expect(mainImage).toHaveAttribute("src", expect.stringContaining("bolt-2ba"));
    expect(mainImage).not.toHaveAttribute("src", expect.stringContaining("bolt-m10"));
  });
});
