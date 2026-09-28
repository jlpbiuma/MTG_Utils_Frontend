import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { SimulatedPurchaseComparison } from "@/components/simulated-purchase-comparison";
import * as actions from "@/actions/simulated-collections";
import responseJson from "../fixtures/cardmarket/list-3-analysis.json";

vi.mock("@/actions/simulated-collections", () => ({
  getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(),
  analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), deleteSimulatedCollection: vi.fn(),
}));
vi.mock("@/components/card-detail-dialog", () => ({ CardDetailDialog: () => null }));

const response = responseJson as actions.SimulatedCollectionAnalysisResponse;
const purchase = response.purchaseAnalysis!;
const fixtures = ["cart-markdown.txt", "list-1.txt", "list-2.txt", "list-3.txt"];
const rawFixture = (filename: string) => readFileSync(path.join(import.meta.dirname, "../fixtures/cardmarket", filename), "utf8");

beforeEach(() => vi.resetAllMocks());

describe("Cardmarket clipboard import", () => {
  it.each(fixtures)("analyzes and saves the entire %s clipboard without removing prices or metadata", async filename => {
    const raw = rawFixture(filename);
    vi.mocked(actions.analyzeRawSimulatedCollection).mockResolvedValue(structuredClone(response));
    vi.mocked(actions.createSimulatedCollection).mockResolvedValue({ ...response, id: "new-sim" });
    const onSaved = vi.fn();
    render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByPlaceholderText("Ej. Lote Wallapop 50 cartas, Cambio Pedro..."), { target: { value: "Mi carrito" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Listado de cartas a simular" }), { target: { value: raw } });
    fireEvent.click(screen.getByRole("button", { name: "Simular y Analizar Lote" }));
    const comparison = await screen.findByRole("region", { name: "Compra vs mercado" });
    expect(actions.analyzeRawSimulatedCollection).toHaveBeenCalledWith(raw, "cardmarket");
    expect(within(comparison).getByText("Wants cubiertos")).toBeInTheDocument();
    expect(within(comparison).getByText("66.7%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar Colección Simulada" }));
    await waitFor(() => expect(actions.createSimulatedCollection).toHaveBeenCalledWith("Mi carrito", undefined, raw.trim(), "cardmarket"));
    expect(onSaved).toHaveBeenCalledWith("new-sim");
  });

  it("retains the original saved clipboard when editing a persisted simulation", async () => {
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue({ ...response, id: "saved" });
    render(<SimulatedCollectionDialog isOpen collectionId="saved" onOpenChange={vi.fn()} />);
    await screen.findByRole("region", { name: "Compra vs mercado" });
    fireEvent.click(screen.getByRole("button", { name: "Editar Cartas" }));
    expect(screen.getByRole("textbox", { name: "Listado de cartas a simular" })).toHaveValue(response.rawText);
  });

  it("shows the comparison after opening a saved simulation from the collections page", async () => {
    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{ ...response, id: "saved", createdAt: "2026-09-26T10:00:00Z", updatedAt: "2026-09-26T10:00:00Z" }]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue({ ...response, id: "saved" });
    render(<SimulatedCollectionsTab />);
    fireEvent.click(await screen.findByText("Carrito de prueba"));
    await screen.findByRole("region", { name: "Compra vs mercado" });
    expect(actions.getSimulatedCollection).toHaveBeenCalledWith("saved", "cardmarket");
  });

  it("keeps input available after a failed analysis", async () => {
    vi.mocked(actions.analyzeRawSimulatedCollection).mockRejectedValue(new Error("Error de conexión"));
    render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "Listado de cartas a simular" });
    fireEvent.change(input, { target: { value: rawFixture("list-1.txt") } });
    fireEvent.click(screen.getByRole("button", { name: "Simular y Analizar Lote" }));
    await screen.findByText("Error de conexión");
    expect(input).toHaveValue(rawFixture("list-1.txt"));
    expect(screen.queryByRole("region", { name: "Compra vs mercado" })).not.toBeInTheDocument();
  });
});

describe("Purchase comparison", () => {
  it("shows backend-calculated savings, wants quantities, group costs and filters the card breakdown", () => {
    render(<SimulatedPurchaseComparison analysis={purchase} />);
    expect(screen.getByText("La compra está por debajo de la referencia de mercado.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2 de 3 copias de wants cubiertas; 1 de 2 nombres completados.")).toBeInTheDocument();
    const groupTable = screen.getByRole("table", { name: "Desglose del coste por destino de las cartas" });
    expect(within(groupTable).getByRole("row", { name: /Cubren wants 2/ })).toHaveTextContent("2,15");
    fireEvent.click(screen.getByText("Ver precios por carta (5 filas)"));
    const table = screen.getByRole("table", { name: "Precios de compra y mercado por carta" });
    expect(within(table).getAllByRole("row")).toHaveLength(6);
    fireEvent.change(screen.getByRole("combobox", { name: "Mostrar cartas" }), { target: { value: "wants" } });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Hero of Precinct One")).toBeInTheDocument();
    expect(within(table).queryByText("Eureka Moment")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Mostrar cartas" }), { target: { value: "unrelated" } });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
  });

  it("labels a negative difference as overpayment and discloses approximate or missing quotes", () => {
    render(<SimulatedPurchaseComparison analysis={{ ...purchase, savings: -2, savingsPercentage: -20,
      approximatePriceCopies: 2, missingMarketPriceCopies: 1, warnings: ["Carta sin precio de compra."] }} />);
    expect(screen.getByText(/La compra está por encima/)).toBeInTheDocument();
    expect(screen.getByText(/2 copias con referencia aproximada · 1 sin precio de mercado/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Avisos de importación" })).toHaveTextContent("Carta sin precio de compra.");
  });

  it("does not claim savings for a cart with no comparable prices", () => {
    render(<SimulatedPurchaseComparison analysis={{ ...purchase, savings: null, savingsPercentage: null,
      wantsValueMinusTotalCost: null, comparedCopies: 0, comparedMarketValue: 0, comparedPurchaseCost: 0,
      missingPurchasePriceCopies: 1 }} />);
    expect(screen.getByText("No hay precios suficientes para comparar.")).toBeInTheDocument();
    expect(screen.getByText("Coste leído (parcial)")).toBeInTheDocument();
    expect(screen.queryByText(/La compra está por debajo/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Sin datos").length).toBeGreaterThan(0);
  });
});

it("filters detailed purchase rows by deck and collection membership and sorts purchase totals", () => {
  const rows = purchase.cards.map((card, index) => ({ ...card, inDecks: index < 2, copiesOwned: index === 1 ? 1 : 0 }));
  render(<SimulatedPurchaseComparison analysis={{ ...purchase, cards: rows }} />);
  fireEvent.click(screen.getByText("Ver precios por carta (5 filas)"));
  const table = screen.getByRole("table", { name: "Precios de compra y mercado por carta" });
  fireEvent.change(screen.getByRole("combobox", { name: "Mostrar cartas" }), { target: { value: "decks" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Ordenar precios por carta" }), { target: { value: "purchase-desc" } });
  expect(within(table).getAllByRole("rowheader")[0]).toHaveTextContent("Nicol Bolas, Dragon-God");
  expect(within(table).getAllByRole("rowheader")).toHaveLength(2);
  fireEvent.change(screen.getByRole("combobox", { name: "Mostrar cartas" }), { target: { value: "owned" } });
  expect(within(table).getAllByRole("rowheader")).toHaveLength(1);
  expect(within(table).getByRole("rowheader")).toHaveTextContent("Nicol Bolas, Dragon-God");
});
