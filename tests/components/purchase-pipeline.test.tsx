import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { OfferControls } from "@/components/offer-controls";
import { SectionNav, BuyTabNav } from "@/components/section-nav";
import { RoutedDeckTabs } from "@/components/routed-deck-tabs";
import { TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { loadOfferReview } from "@/actions/simulated-collections";
import { prepareOfferPurchase, commitPurchase } from "@/actions/acquisitions";
import { purchaseQuote } from "../fixtures/acquisition";
vi.mock("@/actions/acquisitions",()=>({prepareOfferPurchase:vi.fn(),commitPurchase:vi.fn()}));
vi.mock("@/actions/simulated-collections",()=>({loadOfferReview:vi.fn()}));
import { updateOffer, confirmOffer } from "@/actions/purchases";
vi.mock("@/actions/purchases", () => ({
  updateOffer: vi.fn().mockResolvedValue(undefined),
  confirmOffer: vi
    .fn()
    .mockResolvedValue({ batchId: "b", alreadyConfirmed: false }),
}));
beforeEach(() => vi.clearAllMocks());
describe("purchase navigation and confirmation", () => {
  it("persists onboarding steps without sharing them across users", () => {
    localStorage.clear();
    const view = render(
      <OnboardingChecklist userId="alice" hasDecks={false} />,
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Importar tus cartas a la colección",
      }),
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Importar tus cartas a la colección",
      }),
    ).toBeChecked();
    view.rerender(<OnboardingChecklist userId="bob" hasDecks={false} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Importar tus cartas a la colección",
      }),
    ).not.toBeChecked();
    view.rerender(<OnboardingChecklist userId="alice" hasDecks={true} />);
    expect(
      screen.getByRole("checkbox", {
        name: "Importar tus cartas a la colección",
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Crear o importar un mazo" }),
    ).toBeChecked();
  });
  it("keeps three accessible mobile sections and all five buying steps", () => {
    render(
      <>
        <SectionNav mobile />
        <BuyTabNav />
      </>,
    );
    const mobile = screen.getByRole("navigation", { name: "Navegación móvil" });
    expect(mobile.querySelectorAll("a")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "Evaluar oferta" }),
    ).toHaveAttribute("href", "/buy/offers");
    expect(
      screen.getByRole("link", { name: "Lista de compra" }),
    ).toHaveAttribute("href", "/buy/list");
  });
  it("loads archived tab from the URL and writes subsequent changes", () => {
    window.history.replaceState(null, "", "/decks?tab=archived");
    render(
      <RoutedDeckTabs initialTab="my-decks">
        <TabsList>
          <TabsTrigger value="my-decks">Mis mazos</TabsTrigger>
          <TabsTrigger value="archived">Archivados</TabsTrigger>
        </TabsList>
        <TabsContent value="my-decks">Activos</TabsContent>
        <TabsContent value="archived">Archivo</TabsContent>
      </RoutedDeckTabs>,
    );
    expect(screen.getByText("Archivo")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Mis mazos" }), {
      button: 0,
    });
    expect(new URLSearchParams(window.location.search).get("tab")).toBeNull();
  });
  it("saves changed shipping and asks for simple purchase confirmation", async () => {
    const offer={id:"o",name:"Offer",origin:"cardmarket" as const,status:"evaluating" as const,shipping:1,paidTotal:10,cards:[{cardName:"Sol Ring",quantity:1,totalPrice:10}],purchaseAnalysis:{cards:[{cardName:"Sol Ring",quantity:1,purchaseUnitPrice:10} ]}} as unknown as import("@/actions/simulated-collections").SimulatedCollectionAnalysisResponse;
    vi.mocked(loadOfferReview).mockResolvedValue({ok:true,data:offer});
    vi.mocked(prepareOfferPurchase).mockResolvedValue({ok:true,data:{...purchaseQuote,origin:"cardmarket",subtotal:"10.00",shipping:"2.00",fee:"0.90",total:"12.90",costBasis:"paid"}});
    vi.mocked(commitPurchase).mockResolvedValue({ok:true,data:{batchId:"b",alreadyConfirmed:false}});
    render(<OfferControls offer={offer} onUpdated={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.change(screen.getByLabelText("Envío (€)"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button",{name:"Confirmar compra"}));
    const dialog = await screen.findByRole("dialog", { name: "Confirmar compra" });
    expect(within(dialog).getByText(/¿Confirmas que has comprado/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Precio pagado/)).toBeNull();
    expect(within(dialog).queryByRole("region", { name: "Resumen de compra" })).toBeNull();
    expect(updateOffer).toHaveBeenCalledWith("o",expect.objectContaining({shipping:2,origin:"cardmarket"}));
    fireEvent.click(within(dialog).getByRole("button",{name:"Sí, confirmar compra"}));
    await waitFor(()=>expect(commitPurchase).toHaveBeenCalledWith("q",true));
    expect(confirmOffer).not.toHaveBeenCalled();
  });

  it("opens a simple confirmation for an unchanged offer without a redundant save", async () => {
    const offer = {
      id: "o", name: "Offer", origin: "cardmarket" as const,
      status: "evaluating" as const, seller: null, sourceUrl: null,
      shipping: 0, paidTotal: 5, cards: [{ cardName: "Sol Ring", quantity: 1, totalPrice: 5 }],
      purchaseAnalysis: { cards: [{ cardName: "Sol Ring", quantity: 1, purchaseUnitPrice: 5 }] },
    } as unknown as import("@/actions/simulated-collections").SimulatedCollectionAnalysisResponse;
    vi.mocked(loadOfferReview).mockResolvedValue({ok:true,data:offer});
    vi.mocked(prepareOfferPurchase).mockResolvedValue({ ok: true, data: purchaseQuote });

    render(<OfferControls offer={offer} onUpdated={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar compra" }));

    const dialog = await screen.findByRole("dialog", { name: "Confirmar compra" });
    expect(within(dialog).getByRole("button", { name: "Sí, confirmar compra" })).toBeEnabled();
    expect(within(dialog).queryByRole("region", { name: "Resumen de compra" })).toBeNull();
    expect(within(dialog).queryByLabelText(/Precio pagado/)).toBeNull();
    expect(updateOffer).not.toHaveBeenCalled();
    expect(prepareOfferPurchase).toHaveBeenCalledWith("o", expect.objectContaining({ acquiredOn: expect.any(String) }));
  });

  it("shows a recoverable error when the server cannot prepare the review", async () => {
    const offer = { id: "o", name: "Offer", origin: "cardmarket" as const, status: "evaluating" as const, shipping: 0, cards: [] } as unknown as import("@/actions/simulated-collections").SimulatedCollectionAnalysisResponse;
    vi.mocked(loadOfferReview).mockResolvedValue({ ok: false, error: "No se pudo cargar la oferta." });
    render(<OfferControls offer={offer} onUpdated={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar compra" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la oferta.");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not present a confirmation button for a purchased offer", () => {
    render(
      <OfferControls
        offer={{
          id: "o",
          name: "Offer",
          status: "purchased",
          totalCards: 1,
          totalEconomicValue: 0,
          economicValueExcludingOwned: 0,
          sellableValue: 0,
          sellableCardsCount: 0,
          currencySymbol: "€",
          globalNetGain: 0,
          uniqueCards: 1,
          usefulCardsCount: 0,
          alreadyOwnedCardsCount: 1,
          benefitedDecksCount: 0,
          cards: [],
        }}
        onUpdated={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Confirmar compra" }),
    ).toBeNull();
  });
});
