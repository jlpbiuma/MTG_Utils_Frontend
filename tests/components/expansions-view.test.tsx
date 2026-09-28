import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpansionsView } from "@/components/expansions-view";

const { getExpansions, getExpansionCards, getExpansionValueHistory, setExpansionMissingAcquisitionDates, addOrIncrementCard } = vi.hoisted(() => ({ getExpansions: vi.fn(), getExpansionCards: vi.fn(), getExpansionValueHistory: vi.fn(), setExpansionMissingAcquisitionDates: vi.fn(), addOrIncrementCard: vi.fn() }));
vi.mock("@/actions/expansions", () => ({ getExpansions, getExpansionCards, getExpansionValueHistory, setExpansionMissingAcquisitionDates }));
vi.mock("@/actions/collection", () => ({ updateCollectionAcquiredAt: vi.fn(), addOrIncrementCard }));
vi.mock("@/components/card-detail-dialog", () => ({
  CardDetailDialog: ({ cardId, cardName, onOpenChange, onAddToCollection }: { cardId: string; cardName: string; onOpenChange: (open: boolean) => void; onAddToCollection?: () => Promise<void> }) => <div role="dialog"><span>{cardName} details</span><span data-testid="detail-card-id">{cardId}</span>{onAddToCollection && <button onClick={() => void onAddToCollection()}>Añadir a la colección</button>}<button onClick={() => onOpenChange(false)}>Cerrar detalle</button></div>,
}));

describe("ExpansionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExpansions.mockResolvedValue([{ code: "tst", name: "Test Expansion", setType: "expansion", cardCount: 3, ownedCount: 1, completionPercentage: 33, totalValueEur: 40, ownedValueEur: 12.5, iconSvgUri: "https://images.test/images/insecure/rs:fill:64:64:0/tst.webp" }]);
    getExpansionValueHistory.mockResolvedValue({ setCode: "tst", windowDays: 7, currency: "EUR", currencySymbol: "€", currentTotalValue: 40, currentOwnedValue: 12.5, points: [{ date: "2026-09-20", totalValue: 38, ownedValue: 10 }, { date: "2026-09-27", totalValue: 40, ownedValue: 12.5 }] });
    setExpansionMissingAcquisitionDates.mockResolvedValue({ updatedCount: 1 });
    addOrIncrementCard.mockResolvedValue({ id: "owned-2" });
    getExpansionCards.mockResolvedValue([
      { id: "1", catalogId: "c1", setCode: "tst", collectorNumber: "1", cardName: "Owned Card", rarity: "rare", priceTrendAbsoluteChange: 2, priceTrendPercentageChange: 10, isOwned: true, ownedQuantity: 1 },
      { id: "2", catalogId: "c2", setCode: "tst", collectorNumber: "2", cardName: "Missing Card", rarity: "common", priceTrendAbsoluteChange: -1, priceTrendPercentageChange: -20, isOwned: false, ownedQuantity: 0 },
    ]);
  });

  it("shows collection progress and opens an expansion with ownership filters", async () => {
    render(<ExpansionsView />);
    expect(await screen.findByText("Test Expansion")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Test Expansion.*Expansión.*40,00.*En colección.*12,50/ })).toBeTruthy();
    expect(document.querySelector('img[src*="tst.webp"]')?.getAttribute("src")).toContain("images.test");

    fireEvent.click(screen.getByRole("button", { name: /Test Expansion/ }));
    expect(await screen.findByText("Owned Card")).toBeTruthy();
    expect(screen.getByText("1 / 2 · 50%")).toBeTruthy();
    const chart = await screen.findByRole("img", { name: "Gráfica histórica del valor total y del valor en propiedad" });
    expect(chart.querySelector('path[stroke="#f43f5e"]')).toBeTruthy();
    expect(chart.querySelector('path[stroke="#10b981"]')).toBeTruthy();
    expect(chart.querySelector('linearGradient stop[stop-color="#f43f5e"]')).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Periodo del gráfico" })).toHaveValue("7");
    expect(screen.getByText("Valor total de la expansión")).toBeTruthy();
    expect(screen.getByText("Valor en propiedad")).toBeTruthy();
    expect(getExpansionValueHistory).toHaveBeenCalledWith("tst", 7);
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(screen.getByRole("region", { name: "Tendencia del valor de la expansión" })).toHaveTextContent("Total 38,00");
    expect(screen.getByRole("region", { name: "Tendencia del valor de la expansión" })).toHaveTextContent("En propiedad 10,00");
    fireEvent.change(screen.getByRole("combobox", { name: "Periodo del gráfico" }), { target: { value: "30" } });
    await waitFor(() => expect(getExpansionValueHistory).toHaveBeenCalledWith("tst", 30));
    expect(screen.getByText("Missing Card")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de Owned Card" }));
    expect(screen.getByRole("dialog").textContent).toContain("Owned Card details");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar cartas" }), { target: { value: "missing" } });
    await waitFor(() => expect(screen.queryByText("Owned Card")).toBeNull());
    expect(screen.getByText("Missing Card")).toBeTruthy();
  });

  it("exposes price trend metric and an independent direction control", async () => {
    render(<ExpansionsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Test Expansion/ }));
    expect(screen.getByRole("option", { name: "Tendencia absoluta" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Tendencia porcentual" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Periodo de tendencia" })).toHaveValue("acquisition");
    fireEvent.change(screen.getByRole("combobox", { name: "Periodo de tendencia" }), { target: { value: "7d" } });
    expect(screen.getByRole("combobox", { name: "Periodo de tendencia" })).toHaveValue("7d");
    const direction = screen.getByRole("combobox", { name: "Dirección" }) as HTMLSelectElement;
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar cartas" }), { target: { value: "trend_pct" } });
    fireEvent.change(direction, { target: { value: "desc" } });
    const cardButtons = await screen.findAllByRole("button", { name: /Ver detalle de/ });
    expect(cardButtons[0].getAttribute("aria-label")).toBe("Ver detalle de Owned Card");
  });

  it("applies one acquisition checkpoint to every owned card missing a date in the expansion", async () => {
    const cardsWithoutDate = [
      { id: "p1", catalogId: "c1", setCode: "tst", collectorNumber: "1", cardName: "Owned Card", isOwned: true, ownedQuantity: 2 },
      { id: "p2", catalogId: "c2", setCode: "tst", collectorNumber: "2", cardName: "Missing Card", isOwned: false, ownedQuantity: 0 },
    ];
    getExpansionCards.mockReset().mockResolvedValueOnce(cardsWithoutDate).mockResolvedValueOnce([
      { ...cardsWithoutDate[0], collectionCardId: "collection-1", acquiredAt: "2025-04-03T00:00:00Z" },
      cardsWithoutDate[1],
    ]);
    render(<ExpansionsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Test Expansion/ }));
    const input = await screen.findByLabelText("Fecha de adquisición masiva");
    fireEvent.change(input, { target: { value: "2025-04-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar a las cartas sin fecha" }));
    await waitFor(() => expect(setExpansionMissingAcquisitionDates).toHaveBeenCalledWith("tst", "2025-04-03"));
    expect(await screen.findByText("Adquirida: 3 abr 2025")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fecha de adquisición masiva")).toBeNull();
  });

  it("adds a missing printing to the user's collection and refreshes expansion progress", async () => {
    const missing = { id: "printing-2", catalogId: "c2", setCode: "tst", collectorNumber: "2", cardName: "Missing Card", imageUri: "https://images.test/2.jpg", manaCost: "{G}", typeLine: "Creature", isOwned: false, ownedQuantity: 0 };
    getExpansionCards.mockReset().mockResolvedValueOnce([
      { id: "printing-1", catalogId: "c1", setCode: "tst", collectorNumber: "1", cardName: "Owned Card", isOwned: true, ownedQuantity: 1 },
      missing,
    ]).mockResolvedValueOnce([
      { id: "printing-1", catalogId: "c1", setCode: "tst", collectorNumber: "1", cardName: "Owned Card", isOwned: true, ownedQuantity: 1 },
      { ...missing, isOwned: true, ownedQuantity: 1, collectionCardId: "owned-2" },
    ]);
    render(<ExpansionsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Test Expansion/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Ver detalle de Missing Card" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir a la colección" }));
    await waitFor(() => expect(addOrIncrementCard).toHaveBeenCalledWith({
      cardScryfallId: "printing-2", cardName: "Missing Card", quantity: 1, setCode: "tst",
      collectorNumber: "2", manaCost: "{G}", typeLine: "Creature", imageUri: "https://images.test/2.jpg",
    }));
    expect(getExpansionCards).toHaveBeenCalledTimes(2);
    expect(screen.getByText("2 / 2 · 100%")).toBeInTheDocument();
  });

  it("shows a load error instead of reporting an empty expansion when the API fails", async () => {
    getExpansionCards.mockRejectedValueOnce(new Error("API unavailable"));
    render(<ExpansionsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Test Expansion/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar las cartas");
  });

  it("does not mark a collected Marvel Commander card missing and opens its selected printing", async () => {
    getExpansions.mockResolvedValueOnce([{
      code: "mcu", name: "Marvel Commander", setType: "commander", cardCount: 2,
      ownedCount: 1, completionPercentage: 50,
    }]);
    getExpansionCards.mockResolvedValueOnce([
      { id: "msh-printing", catalogId: "captain-marvel-catalog", setCode: "mcu", collectorNumber: "042", cardName: "Captain Marvel, Earth's Protector", isOwned: true, ownedQuantity: 2 },
      { id: "other-printing", catalogId: "other-catalog", setCode: "mcu", collectorNumber: "043", cardName: "Other Hero", isOwned: false, ownedQuantity: 0 },
    ]);

    render(<ExpansionsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Marvel Commander/ }));
    expect(await screen.findByText("Captain Marvel, Earth's Protector")).toBeInTheDocument();
    expect(screen.getByText("En colección ×2")).toBeInTheDocument();
    expect(screen.getByText("1 / 2 · 50%")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar cartas" }), { target: { value: "missing" } });
    expect(screen.queryByText("Captain Marvel, Earth's Protector")).not.toBeInTheDocument();
    expect(screen.getByText("Other Hero")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar cartas" }), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de Captain Marvel, Earth's Protector" }));
    expect(screen.getByTestId("detail-card-id")).toHaveTextContent("msh-printing");
  });
});
