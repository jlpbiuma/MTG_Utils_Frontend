import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import * as actions from "@/actions/simulated-collections";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";
import type { CardPrintingDetail } from "@/actions/scryfall";

vi.mock("@/actions/simulated-collections", () => ({ getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(), analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), deleteSimulatedCollection: vi.fn(), updateSimulatedCardVersion: vi.fn() }));
vi.mock("@/components/card-detail-dialog", async () => {
  const { Dialog, DialogContent, DialogTitle } = await import("@/components/ui/dialog");
  return { CardDetailDialog: ({ onVersionSelect, cardName, onOpenChange }: { onVersionSelect: (version: CardPrintingDetail) => Promise<void>; cardName: string; onOpenChange: (open: boolean) => void }) =>
    <Dialog open onOpenChange={onOpenChange}><DialogContent><DialogTitle>Detalle {cardName}</DialogTitle>
      <button onClick={() => void onVersionSelect({ id: "chosen", set_code: "new", collector_number: "99" })}>Elegir nueva versión</button>
      <button onClick={() => onOpenChange(false)}>Cerrar detalle</button>
    </DialogContent></Dialog> };
});
const original = fixture as actions.SimulatedCollectionAnalysisResponse;
const name = original.cards[0].cardName;
const changed: actions.SimulatedCollectionAnalysisResponse = {
  ...original, id: "saved", printingOverrides: { [name.toLowerCase()]: "chosen" }, totalEconomicValue: 20,
  cards: original.cards.map((card, i) => i ? card : { ...card, selectedPrintingId: "chosen", cardScryfallId: "chosen", setCode: "new", collectorNumber: "99", unitPrice: 12, totalPrice: 12 }),
  purchaseAnalysis: { ...original.purchaseAnalysis!, comparedMarketValue: 20, savings: 16.55,
    cards: original.purchaseAnalysis!.cards.map((card, i) => i ? card : { ...card, marketUnitPrice: 12, marketTotal: 12, savings: 11.85 }),
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{ ...original, id: "saved", createdAt: "2026-09-26", updatedAt: "2026-09-26" }]);
  vi.mocked(actions.getSimulatedCollection).mockResolvedValue({ ...original, id: "saved" });
  vi.mocked(actions.updateSimulatedCardVersion).mockResolvedValue(changed);
});

it("selects a version from the list detail, persists it, and replaces both card and summary prices", async () => {
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText(original.name));
  fireEvent.click(await screen.findByRole("button", { name: "Listado" }));
  const table = screen.getByRole("table", { name: "Cartas de la colección simulada" });
  fireEvent.click(within(table).getByRole("button", { name: `Ver detalles de ${name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Elegir nueva versión" }));
  await waitFor(() => expect(actions.updateSimulatedCardVersion).toHaveBeenCalledWith("saved", name, "chosen", "cardmarket"));
  await waitFor(() => expect(within(table).getByText("Versión elegida: NEW #99")).toBeInTheDocument());
  expect(within(table).getAllByText("12.00 €")).toHaveLength(2);
  expect(within(table).getByText("+11.85 €")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
  const comparison = screen.getByRole("region", { name: "Compra vs mercado" });
  expect(within(comparison).getByText(/\+16,55/)).toBeInTheDocument();
  expect(within(comparison).getByText(/3,45/, { selector: "dd" })).toBeInTheDocument();
});

it("opens detail from purchase rows and retains a temporary choice when saving", async () => {
  vi.mocked(actions.analyzeRawSimulatedCollection).mockResolvedValueOnce(structuredClone(original)).mockResolvedValueOnce(changed);
  vi.mocked(actions.createSimulatedCollection).mockResolvedValue(changed);
  render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("Ej. Lote Wallapop 50 cartas, Cambio Pedro..."), { target: { value: "Cart" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Listado de cartas a simular" }), { target: { value: original.rawText } });
  fireEvent.click(screen.getByRole("button", { name: "Simular y Analizar Lote" }));
  const comparison = await screen.findByRole("region", { name: "Compra vs mercado" });
  fireEvent.click(within(comparison).getByText("Ver precios por carta (5 filas)"));
  fireEvent.click(within(comparison).getByRole("button", { name }));
  fireEvent.click(screen.getByRole("button", { name: "Elegir nueva versión" }));
  await waitFor(() => expect(actions.analyzeRawSimulatedCollection).toHaveBeenLastCalledWith(original.rawText, "cardmarket", changed.printingOverrides));
  await waitFor(() => expect(within(comparison).getByText(/\+16,55/)).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle" }));
  fireEvent.click(screen.getByRole("button", { name: "Guardar Colección Simulada" }));
  await waitFor(() => expect(actions.createSimulatedCollection).toHaveBeenCalledWith("Cart", undefined, original.rawText!.trim(), "cardmarket", changed.printingOverrides));
});
