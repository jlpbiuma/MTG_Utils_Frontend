import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import * as actions from "@/actions/simulated-collections";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";

vi.mock("@/actions/simulated-collections", () => ({
  getDiscoveredOffers: async () => [], getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(),
  analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), deleteSimulatedCollection: vi.fn(),
  removeCardFromSimulatedCollection: vi.fn(), addCardToSimulatedCollection: vi.fn(), updateSimulatedCardVersion: vi.fn(),
}));
vi.mock("@/actions/collection", () => ({ addOrIncrementCard: vi.fn() }));
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
  vi.stubGlobal("confirm", vi.fn(() => true));
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
  const cases = {
    "unit-asc": ["Delta", "Alpha", "Beta", "Gamma"], "unit-desc": ["Beta", "Alpha", "Delta", "Gamma"],
    "purchase-asc": ["Gamma", "Delta", "Alpha", "Beta"], "purchase-desc": ["Beta", "Alpha", "Delta", "Gamma"],
    "difference-asc": ["Beta", "Delta", "Alpha", "Gamma"], "difference-desc": ["Alpha", "Delta", "Beta", "Gamma"],
  };
  for (const [value, expected] of Object.entries(cases)) {
    const [field,direction] = value.split("-");
    const label = {unit:"Precio unitario",purchase:"Precio compra total",difference:"Precio diferencial"}[field as "unit" | "purchase" | "difference"];
    const control = within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).getByRole("button", {name:label});
    if (control.getAttribute("aria-pressed") !== "true") fireEvent.click(control);
    if (!within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).queryByRole("button", {name:new RegExp(`Orden ${direction === "asc" ? "ascendente" : "descendente"}:`)})) fireEvent.click(control);
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
  fireEvent.click(within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).getByRole("button", { name: "Precio compra total" }));
  fireEvent.click(within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).getByRole("button", { name: "Precio compra total" }));
  fireEvent.click(screen.getByRole("button", { name: "Cuadrícula" }));
  const grid = screen.getByLabelText("Cuadrícula de cartas simuladas");
  expect(within(grid).getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  expect(within(grid).queryByRole("heading", { name: "Alpha" })).not.toBeInTheDocument();
  expect(within(grid).getByText("Diferencial total")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Listado" }));
  expect(rowNames(screen.getByRole("table", { name: "Cartas de la colección simulada" }))).toEqual(["Beta"]);
  expect(within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).getByRole("button", { name: "Precio compra total" })).toHaveAttribute("aria-pressed", "true");
  expect(within(screen.getByRole("region", {name:"Opciones de las cartas de la oferta"})).getByRole("button", { name: /Orden ascendente:/ })).toBeInTheDocument();
});

it("deletes selected cards optimistically and continues after one card fails", async () => {
  vi.mocked(actions.getSimulatedCollection)
    .mockResolvedValueOnce(analysis)
    .mockResolvedValueOnce({ ...analysis, cards: [analysis.cards[1]] });
  let rejectFirstRemove!: (error: Error) => void;
  vi.mocked(actions.removeCardFromSimulatedCollection)
    .mockReturnValueOnce(new Promise((_, reject) => { rejectFirstRemove = reject; }))
    .mockResolvedValueOnce(analysis);
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText("Mi carrito"));

  fireEvent.click(await screen.findByRole("checkbox", { name: "Seleccionar Beta" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Gamma" }));
  expect(screen.getByText("2 seleccionadas").parentElement).toHaveClass("fixed", "bottom-20", "md:bottom-5");
  fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
  expect(screen.queryByRole("heading", { name: "Beta" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Gamma" })).not.toBeInTheDocument();
  await act(async () => rejectFirstRemove(new Error("not removable")));

  expect(await screen.findByRole("status")).toHaveTextContent("1 completadas; 1 no se pudieron procesar");
  expect(actions.removeCardFromSimulatedCollection).toHaveBeenCalledTimes(2);
  expect(actions.removeCardFromSimulatedCollection).toHaveBeenNthCalledWith(1, "saved", "Beta", "cardmarket");
  expect(actions.removeCardFromSimulatedCollection).toHaveBeenNthCalledWith(2, "saved", "Gamma", "cardmarket");
  expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Gamma" })).not.toBeInTheDocument();
});

it("keeps saved offers searchable, filters their status and keeps controls in empty results", async () => {
  vi.mocked(actions.getSimulatedCollections).mockResolvedValue([
    {...analysis,id:"saved",seller:"Alice",status:"evaluating",createdAt:"2026-09-26",updatedAt:"2026-09-26"},
    {...analysis,id:"other",name:"Comprada a Bob",seller:"Bob",status:"purchased",createdAt:"2026-09-27",updatedAt:"2026-09-27"},
  ]);
  render(<SimulatedCollectionsTab />);
  await screen.findByText("Comprada a Bob");
  const toolbar = within(screen.getByRole("region", {name:"Opciones del listado de ofertas"}));
  fireEvent.click(toolbar.getByRole("button", {name:"Compradas"}));
  expect(screen.queryByText("Mi carrito")).not.toBeInTheDocument();
  expect(screen.getByText("Comprada a Bob")).toBeInTheDocument();
  fireEvent.change(toolbar.getByRole("searchbox"), {target:{value:"unknown"}});
  expect(screen.getByText("No hay ofertas con estos filtros")).toBeInTheDocument();
  expect(toolbar.getByRole("button", {name:"Nombre"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"Restablecer filtros"}));
  expect(screen.getByText("Mi carrito")).toBeInTheDocument();
  expect(screen.getByText("Comprada a Bob")).toBeInTheDocument();
});

it("searches and sorts benefited decks and retains the choices when switching to a list", async () => {
  const candidate = (deckId: string, deckName: string, potentialGain: number) => ({deckId,deckName,potentialGain,requestedQuantity:1,assignedQuantity:0,missingQuantity:1,completionPercentage:50,colors:[]});
  const growthAnalysis = {...analysis,cards:[{...analysis.cards[1],copiesOwnedReal:0,candidateDecks:[candidate("a","Alpha deck",5),candidate("b","Beta deck",10)]}]};
  vi.mocked(actions.getSimulatedCollection).mockResolvedValue(growthAnalysis);
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText("Mi carrito"));
  fireEvent.click(await screen.findByRole("button",{name:/Crecimiento de Mazos/}));
  const toolbar=within(screen.getByRole("region",{name:"Opciones del crecimiento de mazos"}));
  const beta=screen.getByRole("link",{name:"Beta deck"});
  const alpha=screen.getByRole("link",{name:"Alpha deck"});
  expect(beta.compareDocumentPosition(alpha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(toolbar.getByRole("button",{name:"Nombre"}));
  expect(alpha.compareDocumentPosition(beta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.change(toolbar.getByRole("searchbox"),{target:{value:"Beta"}});
  fireEvent.click(toolbar.getByRole("button",{name:"Lista"}));
  expect(toolbar.getByRole("searchbox")).toHaveValue("Beta");
  expect(toolbar.getByRole("button",{name:"Nombre"})).toHaveAttribute("aria-pressed","true");
  expect(screen.getByRole("link",{name:"Beta deck"})).toBeInTheDocument();
  expect(screen.queryByRole("link",{name:"Alpha deck"})).not.toBeInTheDocument();
});
