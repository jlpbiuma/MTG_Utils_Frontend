import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import * as scryfallActions from "@/actions/scryfall";

vi.mock("@/actions/scryfall", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/actions/scryfall")>();
  return {
    ...actual,
    getCardDetails: vi.fn(),
  };
});

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

  it("should render complete card details in Spanish for single-faced card", async () => {
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

    // Rarity and set metadata in Spanish
    expect(screen.getByText("Infrecuente")).toBeInTheDocument();
    expect(screen.getByText(/Magic 2010/i)).toBeInTheDocument();
    expect(screen.getByText("#146")).toBeInTheDocument();
    expect(screen.getByText("Christopher Moeller")).toBeInTheDocument();

    // Legalities in Spanish
    expect(screen.getByText("Commander / EDH")).toBeInTheDocument();
    expect(screen.getAllByText("Legal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Estándar")).toBeInTheDocument();
    expect(screen.getByText("No legal")).toBeInTheDocument();
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
});
