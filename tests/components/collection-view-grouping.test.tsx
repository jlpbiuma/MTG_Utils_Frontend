import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CollectionView } from "@/components/collection-view";

vi.mock("@/actions/pricing", () => ({
  getCollectionPricesLastUpdated: vi.fn().mockResolvedValue("2026-09-06T10:00:00Z"),
  triggerWeeklyCollectionPricing: vi.fn(),
}));

vi.mock("@/actions/collection", () => ({
  addOrIncrementCard: vi.fn(),
  updateCollectionQuantity: vi.fn(),
  deleteCollectionCard: vi.fn(),
}));

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ prices: {} }),
}) as any;

describe("CollectionView Grouping & KPIs (Swift Parity)", () => {
  const sampleCards = [
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

  it("should render 3 KPI stats including Mazos count", () => {
    render(
      <CollectionView
        initialCards={sampleCards}
        initialStats={{
          uniqueCards: 3,
          totalCards: 17,
          decksCount: 5,
        }}
      />
    );

    expect(screen.getByText("Cartas Únicas")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Total Copias")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();

    expect(screen.getByText("Mazos")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should group cards into category sections with section headers by default", () => {
    render(
      <CollectionView
        initialCards={sampleCards}
        initialStats={{
          uniqueCards: 3,
          totalCards: 17,
          decksCount: 2,
        }}
      />
    );

    // Section headers for Criaturas, Instantáneos, and Tierras
    expect(screen.getByRole("heading", { name: "Criaturas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Instantáneos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tierras" })).toBeInTheDocument();

    // Section card counts
    expect(screen.getByText("4 cartas (1 únicas)")).toBeInTheDocument();
    expect(screen.getByText("3 cartas (1 únicas)")).toBeInTheDocument();
    expect(screen.getByText("10 cartas (1 únicas)")).toBeInTheDocument();
  });

  it("should toggle between category grouped view and continuous flat grid", () => {
    render(
      <CollectionView
        initialCards={sampleCards}
        initialStats={{
          uniqueCards: 3,
          totalCards: 17,
          decksCount: 2,
        }}
      />
    );

    const gridBtn = screen.getByRole("button", { name: /Cuadrícula/i });
    fireEvent.click(gridBtn);

    // Section headers should no longer be present in flat grid mode
    expect(screen.queryByRole("heading", { name: "Criaturas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tierras" })).not.toBeInTheDocument();

    // All card titles are still present
    expect(screen.getByText("Llanowar Elves")).toBeInTheDocument();
    expect(screen.getByText("Forest")).toBeInTheDocument();
    expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();

    // Click back to Por Categoría
    const categoryBtn = screen.getByRole("button", { name: /Por Categoría/i });
    fireEvent.click(categoryBtn);

    expect(screen.getByRole("heading", { name: "Criaturas" })).toBeInTheDocument();
  });

  it("should switch to flat filtered list when searching by card name", () => {
    render(
      <CollectionView
        initialCards={sampleCards}
        initialStats={{
          uniqueCards: 3,
          totalCards: 17,
          decksCount: 2,
        }}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Filtrar cartas de tu colección por nombre/i);
    fireEvent.change(searchInput, { target: { value: "Bolt" } });

    // Lightning Bolt is shown, others filtered out
    expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
    expect(screen.queryByText("Forest")).not.toBeInTheDocument();
    expect(screen.queryByText("Llanowar Elves")).not.toBeInTheDocument();
  });
});
