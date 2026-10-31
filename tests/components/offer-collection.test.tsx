import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import * as offers from "@/actions/simulated-collections";
import { prepareOfferPurchase, commitPurchase } from "@/actions/acquisitions";
import { purchaseQuote } from "../fixtures/acquisition";
import { confirmOffer } from "@/actions/purchases";
import { OfferCollectionDialog } from "@/components/offer-collection-dialog";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";
vi.mock("@/actions/simulated-collections", () => ({ getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(), getDiscoveredOffers: vi.fn(), importOfferLink: vi.fn(), deleteSimulatedCollection: vi.fn(), updateSimulatedCardVersion: vi.fn(), addCardToSimulatedCollection: vi.fn(), removeCardFromSimulatedCollection: vi.fn() }));
vi.mock("@/actions/whatsapp-matches", () => ({ getWhatsAppMatches: vi.fn().mockResolvedValue({ wants_matches: [], collection_matches: [], total_cards_scanned: 0, total_wants_matches: 0, total_collection_matches: 0 }) }));
vi.mock("@/lib/reads", async () => {
  const offers = await import("@/actions/simulated-collections");
  const matches = await import("@/actions/whatsapp-matches");
  return {
    getSimulatedCollections: (...args: Parameters<typeof offers.getSimulatedCollections>) => offers.getSimulatedCollections(...args),
    getSimulatedCollection: (...args: Parameters<typeof offers.getSimulatedCollection>) => offers.getSimulatedCollection(...args),
    getDiscoveredOffers: (...args: Parameters<typeof offers.getDiscoveredOffers>) => offers.getDiscoveredOffers(...args),
    getWhatsAppMatches: (...args: Parameters<typeof matches.getWhatsAppMatches>) => matches.getWhatsAppMatches(...args),
  };
});
vi.mock("@/actions/acquisitions",()=>({prepareOfferPurchase:vi.fn(),commitPurchase:vi.fn()}));
vi.mock("@/actions/purchases", () => ({ confirmOffer: vi.fn(), updateOffer: vi.fn() }));
vi.mock("@/components/card-detail-dialog", () => ({ CardDetailDialog: () => null }));
const analysis: offers.SimulatedCollectionAnalysisResponse = { ...fixture as offers.SimulatedCollectionAnalysisResponse, id: "offer", name: "Lote prueba", status: "evaluating", cards: (fixture as offers.SimulatedCollectionAnalysisResponse).cards.slice(0, 2).map((card, index) => ({ ...card, cardName: index ? "Beta" : "Alpha", quantity: index ? 2 : 7 })) };
const summary: offers.SimulatedCollectionSummary = { ...analysis, id: "offer", createdAt: "", updatedAt: "" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prepareOfferPurchase).mockResolvedValue({ok:true,data:purchaseQuote});
  vi.mocked(commitPurchase).mockResolvedValue({ok:true,data:{batchId:"batch",alreadyConfirmed:false}});
  vi.mocked(offers.getSimulatedCollections).mockResolvedValue([summary]);
  vi.mocked(offers.getSimulatedCollection).mockResolvedValue(analysis);
  vi.mocked(offers.getDiscoveredOffers).mockResolvedValue([]);
  vi.mocked(confirmOffer).mockResolvedValue({ batchId: "batch", alreadyConfirmed: false });
});
it("opens a modal from the listing and cancelling never adds inventory", async () => {
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByRole("button", { name: "Añadir Lote prueba a colección" }));
  const dialog = await screen.findByRole("dialog", { name: "Añadir a colección" });
  expect(within(dialog).getByText("2 nombres · 9 copias")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Coincidencias de la oferta" })).toBeNull();
  expect(confirmOffer).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(confirmOffer).not.toHaveBeenCalled();
});
it("adds the whole offer after explicit confirmation and refreshes the listing", async () => {
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByRole("button", { name: "Añadir Lote prueba a colección" }));
  const dialog = await screen.findByRole("dialog");
  await waitFor(()=>expect(within(dialog).getByRole("button",{name:"Confirmar incorporación"})).toBeEnabled());
  await waitFor(()=>expect(within(dialog).getByRole("button",{name:"Confirmar incorporación"})).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar incorporación" }));
  await waitFor(() => expect(commitPurchase).toHaveBeenCalledWith("q",false));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByRole("status")).toHaveTextContent("2 cartas añadidas");
  expect(offers.getSimulatedCollections).toHaveBeenCalledTimes(2);
});
it("adds only the selected individual card and leaves unselected cards available", async () => {
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText("Lote prueba"));
  fireEvent.click(await screen.findByRole("button", { name: "Listado" }));
  const table = screen.getByRole("table", { name: "Cartas de la colección simulada" });
  fireEvent.click(within(table).getByRole("checkbox", { name: "Seleccionar Alpha" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir selección a colección" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("7× Alpha")).toBeInTheDocument();
  expect(within(dialog).queryByText("2× Beta")).toBeNull();
  expect(confirmOffer).not.toHaveBeenCalled();
  vi.mocked(offers.getSimulatedCollection).mockResolvedValue({ ...analysis, cards: [analysis.cards[1]] });
  await waitFor(()=>expect(within(dialog).getByRole("button",{name:"Confirmar incorporación"})).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar incorporación" }));
  await waitFor(() => expect(prepareOfferPurchase).toHaveBeenCalledWith("offer",expect.objectContaining({cardNames:["Alpha"]})));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(within(table).queryByRole("rowheader", { name: /Alpha/ })).toBeNull();
  expect(within(table).getByRole("button", { name: "Beta" })).toBeInTheDocument();
  expect(offers.removeCardFromSimulatedCollection).not.toHaveBeenCalled();
});
it("imports a discovered offer before asking to add its cards", async () => {
  vi.mocked(offers.getSimulatedCollections).mockResolvedValue([]);
  vi.mocked(offers.getDiscoveredOffers).mockResolvedValue([{ ...summary, id: "discovery:x", sourceUrl: "https://manabox.app/decks/x", origin: "whatsapp" }]);
  vi.mocked(offers.importOfferLink).mockResolvedValue(analysis);
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByRole("button", { name: "Añadir Lote prueba a colección" }));
  await screen.findByRole("dialog");
  expect(offers.importOfferLink).toHaveBeenCalledWith(expect.objectContaining({ savedOnly: true, origin: "whatsapp" }));
  expect(confirmOffer).not.toHaveBeenCalled();
});
it("disables adding already purchased offers and hides acquisition on selling demands", async () => {
  vi.mocked(offers.getSimulatedCollections).mockResolvedValue([{ ...summary, status: "purchased" }, { ...summary, id: "selling", name: "Demanda", opportunitySubject: "compra_busca" }]);
  render(<SimulatedCollectionsTab />);
  expect(await screen.findByRole("button", { name: "Añadir Lote prueba a colección" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Añadir Demanda a colección" })).toBeNull();
});
it("keeps the confirmation open on errors and prevents double submissions", async () => {
  let reject!: (error: Error) => void;
  const confirm = vi.fn(() => new Promise<void>((_, rejectPromise) => { reject = rejectPromise; }));
  render(<OfferCollectionDialog name="Lote" cards={[{ cardName: "Alpha", quantity: 7 }]} initialCost={0} selection onClose={vi.fn()} onConfirm={confirm} />);
  const button = screen.getByRole("button", { name: "Confirmar incorporación" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Añadiendo…" })).toBeDisabled();
  reject(new Error("Selecciona la edición exacta"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Selecciona la edición exacta");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("uses imported Cardmarket prices and only asks for the acquisition date", async () => {
  render(<OfferCollectionDialog
    finance={{offerId:"cm-offer", origin:"cardmarket"}}
    name="Carrito Cardmarket" cards={[{cardName:"Sol Ring",quantity:2}]} initialCost={2.5}
    selection={false} onClose={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)}
  />);
  const dialog = await screen.findByRole("dialog", {name:"Añadir a colección"});
  expect(within(dialog).getByLabelText("Fecha de adquisición")).toBeInTheDocument();
  expect(within(dialog).queryByLabelText("Precio pagado: Sol Ring")).toBeNull();
  await waitFor(() => expect(prepareOfferPurchase).toHaveBeenCalledWith("cm-offer", expect.objectContaining({
    acquiredOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    purchasePrices: {},
  })));
});

it("keeps the confirmation dialog open when preparing the purchase fails", async () => {
  vi.mocked(prepareOfferPurchase).mockRejectedValueOnce(new Error("backend unavailable"));
  render(<OfferCollectionDialog
    finance={{offerId:"cm-offer", origin:"cardmarket"}}
    name="Carrito Cardmarket" cards={[{cardName:"Sol Ring",quantity:1}]} initialCost={1}
    selection={false} onClose={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)}
  />);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo preparar la confirmación de compra");
  expect(screen.getByRole("dialog", {name:"Añadir a colección"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Confirmar incorporación"})).toBeDisabled();
});

it("uses edition trend prices and zero shipping for an in-person selection", async () => {
  const physical: offers.SimulatedCollectionAnalysisResponse = { ...analysis, origin: "in_person", shipping: 20, paidTotal: 999,
    cards: analysis.cards.map(card => ({ ...card, unitPrice: 3, totalPrice: card.quantity * 3 })) };
  vi.mocked(offers.getSimulatedCollections).mockResolvedValue([{ ...summary, origin: "in_person" }]);
  vi.mocked(offers.getSimulatedCollection).mockResolvedValue(physical);
  render(<SimulatedCollectionsTab />);
  fireEvent.click(await screen.findByText("Lote prueba"));
  expect(await screen.findByText(/Origen: Venta presencial/)).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Compra vs mercado" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Coincidencias de la oferta" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Histórico global de la oferta" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Listado" }));
  const table = screen.getByRole("table", { name: "Cartas de la colección simulada" });
  fireEvent.click(within(table).getByRole("checkbox", { name: "Seleccionar Alpha" }));
  fireEvent.click(screen.getByRole("button", { name: "Añadir selección a colección" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).queryByLabelText("Coste de las cartas (€)")).toBeNull();
  expect(await within(dialog).findByText(/Gasto estimado/)).toBeInTheDocument();
  await waitFor(()=>expect(within(dialog).getByRole("button",{name:"Confirmar incorporación"})).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar incorporación" }));
  await waitFor(() => expect(commitPurchase).toHaveBeenCalledWith("q",false));
});
