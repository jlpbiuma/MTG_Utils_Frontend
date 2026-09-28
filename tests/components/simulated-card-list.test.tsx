import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import * as actions from "@/actions/simulated-collections";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";

vi.mock("@/actions/simulated-collections", () => ({
  getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(),
  analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), deleteSimulatedCollection: vi.fn(),
}));
vi.mock("@/components/card-detail-dialog", () => ({ CardDetailDialog: ({ cardName }: { cardName: string }) => <div role="dialog" aria-label={`Detalles: ${cardName}`} /> }));

const response = fixture as actions.SimulatedCollectionAnalysisResponse;
const names = ["Alpha", "Beta", "Gamma", "Delta"];
const purchaseRows = names.map((cardName, i) => ({ ...response.purchaseAnalysis!.cards[0], cardName,
  quantity: i === 0 ? 2 : 1, inWants: i === 0, inDecks: i < 2, copiesOwned: i === 0 || i === 3 ? 1 : 0,
  wantsCoveredCopies: i === 0 ? 1 : 0, purchaseTotal: [2, 6, 0, 1][i], marketTotal: [6, 5, null, 1][i],
  marketUnitPrice: [3, 5, null, 1][i], savings: [4, -1, null, 0][i],
}));
const analysis: actions.SimulatedCollectionAnalysisResponse = {
  ...response, id: "saved", name: "Mi carrito",
  cards: names.map((cardName, i) => ({ ...response.cards[0], cardName, quantity: purchaseRows[i].quantity,
    inWants: i === 0, copiesNeededTotal: i < 2 ? 1 : 0, copiesOwnedReal: purchaseRows[i].copiesOwned,
    candidateDecks: [], candidateDeckCount: 0, usefulCopies: i === 1 ? 1 : 0,
  })),
  purchaseAnalysis: { ...response.purchaseAnalysis!, cards: purchaseRows },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{ ...analysis, id: "saved", createdAt: "2026-09-26", updatedAt: "2026-09-26" }]);
  vi.mocked(actions.getSimulatedCollection).mockResolvedValue(analysis);
});
async function openList() {
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText("Mi carrito"));
  fireEvent.click(await screen.findByRole("button", { name: "Listado" }));
  return screen.getByRole("table", { name: "Cartas de la colección simulada" });
}
function rowNames(table: HTMLElement) {
  return within(table).queryAllByRole("rowheader").map(row => within(row).getByRole("button", { name: /^(Alpha|Beta|Gamma|Delta)$/ }).textContent);
}

it("sorts both ways by unit market price, purchase total, and differential, keeping missing values last", async () => {
  const table = await openList();
  const sorting = screen.getByRole("combobox", { name: "Ordenar cartas simuladas" });
  const cases = {
    "unit-asc": ["Delta", "Alpha", "Beta", "Gamma"], "unit-desc": ["Beta", "Alpha", "Delta", "Gamma"],
    "purchase-asc": ["Gamma", "Delta", "Alpha", "Beta"], "purchase-desc": ["Beta", "Alpha", "Delta", "Gamma"],
    "difference-asc": ["Beta", "Delta", "Alpha", "Gamma"], "difference-desc": ["Alpha", "Delta", "Beta", "Gamma"],
  };
  for (const [value, expected] of Object.entries(cases)) {
    fireEvent.change(sorting, { target: { value } });
    expect(rowNames(table)).toEqual(expected);
  }
  expect(within(table).getByRole("columnheader", { name: "Tags" })).toBeInTheDocument();
  expect(within(table).getByRole("columnheader", { name: "Cantidad" })).toBeInTheDocument();
  fireEvent.click(within(table).getByRole("button", { name: "Ver detalles de Alpha" }));
  expect(screen.getByRole("dialog", { name: "Detalles: Alpha" })).toBeInTheDocument();
});

it("filters by membership including owned cards in decks, and retains filters/search/order when switching views", async () => {
  const table = await openList();
  for (const [label, expected] of [
    [/^Wants \(/, ["Alpha"]], [/^En mazos \(/, ["Alpha", "Beta"]],
    [/^Ya en colección \(/, ["Alpha", "Delta"]], [/^Fuera de todo \(/, ["Gamma"]],
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(rowNames(table)).toEqual(expected);
  }
  fireEvent.click(screen.getByRole("button", { name: /^En mazos \(/ }));
  fireEvent.change(screen.getByPlaceholderText("Filtrar cartas de tu colección simulada por nombre..."), { target: { value: "Beta" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Ordenar cartas simuladas" }), { target: { value: "purchase-asc" } });
  fireEvent.click(screen.getByRole("button", { name: "Cuadrícula" }));
  const grid = screen.getByLabelText("Cuadrícula de cartas simuladas");
  expect(within(grid).getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  expect(within(grid).queryByRole("heading", { name: "Alpha" })).not.toBeInTheDocument();
  expect(within(grid).getByText("Diferencial total")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Listado" }));
  expect(rowNames(screen.getByRole("table", { name: "Cartas de la colección simulada" }))).toEqual(["Beta"]);
  expect(screen.getByRole("combobox", { name: "Ordenar cartas simuladas" })).toHaveValue("purchase-asc");
});
