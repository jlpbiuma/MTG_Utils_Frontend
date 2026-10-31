import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { OfferOpportunities } from "@/components/offer-opportunities";
import { BuyTabNav } from "@/components/section-nav";
import * as actions from "@/actions/simulated-collections";
import * as discovery from "@/actions/whatsapp-matches";
import fixture from "../fixtures/cardmarket/list-3-analysis.json";
vi.mock("next/navigation", () => ({ usePathname: () => "/buy/offers" }));
vi.mock("@/actions/simulated-collections", () => ({ getDiscoveredOffers: vi.fn().mockResolvedValue([]), getSimulatedCollections: vi.fn(), getSimulatedCollection: vi.fn(), analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), importOfferLink: vi.fn(), deleteSimulatedCollection: vi.fn() }));
vi.mock("@/actions/whatsapp-matches", () => ({ getWhatsAppMatches: vi.fn() }));
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
vi.mock("@/components/card-detail-dialog", () => ({ CardDetailDialog: () => null }));
const response = fixture as actions.SimulatedCollectionAnalysisResponse;
const match: discovery.WhatsAppDealMatch = { id: 1, card_name: "Alpha", normalized_name: "alpha", subject: "vende", whatsapp_url: "https://manabox.app/decks/x", source_phone: "123", source_chat: "Grupo", direct_whatsapp_link: "https://wa.me/123", extra: { quantity: 7 }, trade_quantity: 1, unit_price: 2, trend_unit_price: 3, completion_gain: 0.5, global_completion_after: 0.5, completion_requirements: [{ deck_card_id: "a", deck_id: "a", total_cards: 100, owned_cards: 0, quantity: 1, assigned_quantity: 0, collection_quantity: 0 }], matched_want: { want_id: "", quantity_wanted: 1, requested_decks: ["Deck A"] } };
const opportunities: discovery.WhatsAppMatchesResponse = { wants_matches: [match], collection_matches: [], total_wants_matches: 1, total_collection_matches: 0, total_cards_scanned: 24, global_deck_count: 2, global_completion_before: 0 };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(actions.getDiscoveredOffers).mockResolvedValue([]); vi.mocked(actions.getSimulatedCollections).mockResolvedValue([]); vi.mocked(discovery.getWhatsAppMatches).mockResolvedValue({ ...opportunities, wants_matches: [] }); });
describe("Unified Evaluar oferta", () => {
  it("has one purchase tab with the existing name", () => {
    render(<BuyTabNav />);
    expect(screen.getByRole("link", { name: "Evaluar oferta" })).toHaveAttribute("href", "/buy/offers");
    expect(screen.queryByRole("link", { name: "Oportunidades" })).toBeNull();
  });
  it.each(["whatsapp", "cardmarket", "in_person", "other"] as const)("accepts the supplied clipboard with origin %s", async origin => {
    const raw = readFileSync(path.join(import.meta.dirname, "../fixtures/cardmarket/order-clipboard.txt"), "utf8");
    vi.mocked(actions.analyzeRawSimulatedCollection).mockResolvedValue(structuredClone(response));
    vi.mocked(actions.createSimulatedCollection).mockResolvedValue({ ...response, id: "new" });
    render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Origen de la oferta"), { target: { value: origin } });
    fireEvent.change(screen.getByPlaceholderText("Ej. Lote Wallapop 50 cartas, Cambio Pedro..."), { target: { value: "Pedido" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Listado de cartas a simular" }), { target: { value: raw } });
    fireEvent.click(screen.getByRole("button", { name: "Evaluar oferta" }));
    await screen.findByRole("button", { name: "Guardar oferta" });
    expect(screen.queryByRole("region", { name: "Compra vs mercado" }) !== null).toBe(origin === "cardmarket");
    if (origin !== "cardmarket") expect(screen.queryByRole("region", { name: "Histórico global de la oferta" })).toBeNull();
    expect(actions.analyzeRawSimulatedCollection).toHaveBeenCalledWith(raw, "cardmarket", {}, origin);
    fireEvent.click(screen.getByRole("button", { name: "Guardar oferta" }));
    await waitFor(() => expect(actions.createSimulatedCollection).toHaveBeenCalledWith("Pedido", undefined, raw.trim(), "cardmarket", {}, origin));
  });
  it("imports a buyer's public list for selling", async () => {
    const onSaved = vi.fn();
    vi.mocked(actions.importOfferLink).mockResolvedValue({ ...response, id: "link-offer" });
    render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText("Enlace público"), { target: { value: match.whatsapp_url } });
    fireEvent.change(screen.getByLabelText("Tipo de lista"), { target: { value: "compra_busca" } });
    fireEvent.change(screen.getByLabelText("Origen de la oferta"), { target: { value: "whatsapp" } });
    fireEvent.click(screen.getByRole("button", { name: "Evaluar oferta" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("link-offer"));
    expect(actions.importOfferLink).toHaveBeenCalledWith({ url: match.whatsapp_url, name: undefined, origin: "whatsapp", subject: "compra_busca" });
  });
  it("opens discovery in the existing detail with both sets of metrics", async () => {
    vi.mocked(discovery.getWhatsAppMatches).mockResolvedValue(opportunities);
    const saved = { ...response, id: "saved", name: "Grupo", origin: "whatsapp" as const, sourceUrl: match.whatsapp_url, opportunitySubject: "vende" as const, opportunityMatches: opportunities };
    vi.mocked(actions.getDiscoveredOffers).mockResolvedValue([{ ...saved, id: `discovery:x`, createdAt: "", updatedAt: "" }]);
    vi.mocked(actions.importOfferLink).mockResolvedValue(saved);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(saved);
    render(<SimulatedCollectionsTab />);
    fireEvent.click(await screen.findByText("Grupo"));
    await screen.findByText(/Origen: WhatsApp/);
    expect(screen.queryByRole("region", { name: "Coincidencias de la oferta" })).toBeNull();
    expect(actions.importOfferLink).toHaveBeenCalledWith({ url: match.whatsapp_url, name: "Grupo", origin: "whatsapp", subject: "vende", savedOnly: true });
    expect(screen.queryByRole("region", { name: "Compra vs mercado" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Histórico global de la oferta" })).toBeNull();
  });
  it("reaches 100 percent when three missing names complete a deck", async () => {
    const cards = response.cards.slice(0, 3).map(card => ({ ...card, quantity: 7, copiesOwnedReal: 0, typeLine: "Creature", candidateDecks: [{ deckId: "thirds", deckName: "Three names", colors: [], completionPercentage: 0, totalCards: 3, ownedCards: 0, requestedQuantity: 7, assignedQuantity: 0, missingQuantity: 1, potentialGain: 33.3 }] }));
    const saved = { ...response, id: "rounded", name: "Thirds", cards };
    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{ ...saved, createdAt: "", updatedAt: "" }]);
    vi.mocked(actions.getSimulatedCollection).mockResolvedValue(saved);
    render(<SimulatedCollectionsTab />);
    fireEvent.click(await screen.findByText("Thirds"));
    fireEvent.click(await screen.findByRole("button", { name: "Crecimiento de Mazos (1)" }));
    expect(screen.getByText("100.0%")).toBeInTheDocument();
    expect(screen.queryByText("99.9%")).toBeNull();
  });
  it("retains selection, prices, export and contact", () => {
    render(<OfferOpportunities data={opportunities} />);
    expect(screen.getByRole("status", { name: "Valor de la selección" })).toHaveTextContent("2,00");
    expect(screen.getByRole("status", { name: "Valor de tendencia de la selección" })).toHaveTextContent("3,00");
    expect(screen.getByRole("status", { name: "Completitud global con la selección" })).toHaveTextContent("0.00% → 0.50%");
    expect(screen.getByRole("link", { name: "Contactar por WhatsApp" })).toHaveAttribute("href", match.direct_whatsapp_link);
    expect(screen.getByRole("button", { name: "Generar lista de compra" })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Alpha" }));
    expect(screen.getByRole("status", { name: "Completitud global con la selección" })).toHaveTextContent("0.00% → 0.00%");
    expect(screen.getByRole("button", { name: "Generar lista de compra" })).toBeDisabled();
  });
  it("filters persisted offers by source", async () => {
    vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{ ...response, id: "wa", name: "WhatsApp lote", origin: "whatsapp", createdAt: "", updatedAt: "" }, { ...response, id: "cm", name: "Pedido CM", origin: "cardmarket", createdAt: "", updatedAt: "" }]);
    render(<SimulatedCollectionsTab />);
    await screen.findByText("WhatsApp lote");
    fireEvent.click(within(screen.getByRole("group", { name: "Origen" })).getByRole("button", { name: "Cardmarket" }));
    expect(screen.queryByText("WhatsApp lote")).toBeNull();
    expect(screen.getByText("Pedido CM")).toBeInTheDocument();
  });
});


it("shows saved offers while discovery is slow and keeps them usable if discovery fails", async () => {
  let reject!: (error: Error) => void;
  vi.mocked(actions.getSimulatedCollections).mockResolvedValue([{...response,id:"fast",name:"Oferta inmediata",createdAt:"",updatedAt:""}]);
  vi.mocked(actions.getSimulatedCollection).mockResolvedValue({...response,id:"fast",name:"Oferta inmediata"});
  vi.mocked(actions.getDiscoveredOffers).mockImplementation(() => new Promise((_,r)=>{reject=r;}));
  render(<SimulatedCollectionsTab/>);
  const saved=await screen.findByText("Oferta inmediata");
  expect(saved).toBeInTheDocument();
  expect(screen.getByText("Buscando ofertas adicionales…")).toBeInTheDocument();
  reject(new Error("Discovery unavailable"));
  await screen.findByText("No se pudieron cargar las ofertas adicionales. Puedes consultar las ofertas guardadas.");
  fireEvent.click(saved);
  await waitFor(()=>expect(actions.getSimulatedCollection).toHaveBeenCalledWith("fast","cardmarket"));
});
