import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import * as api from "@/actions/acquisitions";
import { purchaseQuote } from "../fixtures/acquisition";
import { OfferCollectionDialog } from "@/components/offer-collection-dialog";
import { InventoryAcquisitionDialog } from "@/components/inventory-acquisition-dialog";
import { ExpensesView } from "@/components/expenses-view";
import { CardPurchaseProvenance } from "@/components/card-purchase-provenance";
import type { ExpenseDetail } from "@/lib/acquisitions";
vi.mock("@/actions/acquisitions", () => ({
  prepareOfferPurchase: vi.fn(),
  prepareInventoryPurchase: vi.fn(),
  commitPurchase: vi.fn(),
  getExpenseLedger: vi.fn(),
  getExpenseDetail: vi.fn(),
  editExpense: vi.fn(),
  annulExpense: vi.fn(),
  getPurchaseProvenance: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.prepareOfferPurchase).mockResolvedValue({
    ok: true,
    data: purchaseQuote,
  });
  vi.mocked(api.prepareInventoryPurchase).mockResolvedValue({
    ok: true,
    data: purchaseQuote,
  });
  vi.mocked(api.commitPurchase).mockResolvedValue({
    ok: true,
    data: { batchId: "b", alreadyConfirmed: false },
  });
});
it("requires explicit budget acknowledgement and keeps the review open on server errors", async () => {
  const quote = {
    ...purchaseQuote,
    budget: {
      ...purchaseQuote.budget,
      spent: 601,
      remaining: -1,
      excess: 1,
      requiresAcknowledgement: true,
    },
  };
  vi.mocked(api.prepareOfferPurchase).mockResolvedValue({
    ok: true,
    data: quote,
  });
  vi.mocked(api.commitPurchase).mockResolvedValue({
    ok: false,
    error: "Las copias han cambiado",
  });
  const close = vi.fn();
  render(
    <OfferCollectionDialog
      name="Oferta"
      cards={[{ cardName: "Sol Ring", quantity: 1 }]}
      initialCost={40}
      selection={false}
      finance={{ offerId: "o", origin: "other", valuationRevision: "visible" }}
      onClose={close}
      onConfirm={vi.fn()}
    />,
  );
  await screen.findByText(/Se supera el límite anual/);
  const confirm = screen.getByRole("button", {
    name: "Confirmar incorporación",
  });
  expect(confirm).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(confirm);
  expect(await screen.findByRole("alert", { name: "" })).toBeInTheDocument();
  await screen.findByText("Las copias han cambiado");
  expect(api.commitPurchase).toHaveBeenCalledWith("q", true);
  expect(close).not.toHaveBeenCalled();
});
it("uses imported Cardmarket prices without asking for them again", async () => {
  render(
    <OfferCollectionDialog
      name="CM"
      cards={[{ cardName: "Sol Ring", quantity: 2 }]}
      initialCost={10}
      selection={false}
      finance={{
        offerId: "o",
        origin: "cardmarket",
        valuationRevision: "v1",
      }}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
    />,
  );
  await screen.findByRole("region", { name: "Resumen de compra" });
  expect(screen.queryByLabelText("Precio pagado: Sol Ring")).toBeNull();
  await waitFor(() =>
    expect(api.prepareOfferPurchase).toHaveBeenLastCalledWith(
      "o",
      expect.objectContaining({
        valuationRevision: "v1",
        purchasePrices: {},
      }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Confirmar incorporación" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar incorporación" }),
  );
  await waitFor(() =>
    expect(api.commitPurchase).toHaveBeenCalledWith("q", false),
  );
});
it("inventory adjustments never create expenses, while a purchase commits its quote", async () => {
  const adjustment = vi.fn().mockResolvedValue(undefined),
    saved = vi.fn();
  const view = render(
    <InventoryAcquisitionDialog
      printingId="p"
      cardName="Sol Ring"
      quantity={1}
      onAdjustment={adjustment}
      onSaved={saved}
      onClose={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar incorporación" }),
  );
  await waitFor(() => expect(adjustment).toHaveBeenCalledOnce());
  expect(api.commitPurchase).not.toHaveBeenCalled();
  view.unmount();
  render(
    <InventoryAcquisitionDialog
      printingId="p"
      cardName="Sol Ring"
      quantity={1}
      onAdjustment={adjustment}
      onSaved={saved}
      onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Tipo de incorporación"), {
    target: { value: "purchase" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar compra" }));
  await screen.findByRole("region", { name: "Resumen de compra" });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar incorporación" }),
  );
  await waitFor(() =>
    expect(api.commitPurchase).toHaveBeenCalledWith("q", false),
  );
  expect(adjustment).toHaveBeenCalledTimes(1);
});
const detail = {
  id: "b",
  name: "Precon",
  kind: "precon",
  origin: "other",
  seller: "Tienda",
  sourceUrl: null,
  acquiredOn: "2026-01-01",
  currency: "EUR",
  costBasis: "allocated",
  subtotal: 40,
  shipping: 0,
  fee: 0,
  investment: 40,
  annulledAt: null,
  itemCount: 1,
  copies: 2,
  pricedItems: 1,
  marketValue: 30,
  initialValue: null,
  referenceItems: 0,
  complete: true,
  profit: -10,
  roi: -25,
  marketChange: null,
  items: [],
  points: [],
} satisfies ExpenseDetail;
it("shows the ledger and old purchase entry, filters and explicitly annuls without deleting inventory", async () => {
  vi.mocked(api.getExpenseLedger).mockResolvedValue({
    ok: true,
    data: {
      year: 2026,
      years: [2026],
      budget: purchaseQuote.budget,
      purchases: [detail],
    },
  });
  vi.mocked(api.getExpenseDetail).mockResolvedValue({ ok: true, data: detail });
  vi.mocked(api.annulExpense).mockResolvedValue({
    ok: true,
    data: { annulled: true },
  });
  render(<ExpensesView />);
  expect(
    screen.getByRole("button", { name: "Registrar compra antigua" }),
  ).toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Precon" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/Ganancia no realizada:/)).toHaveTextContent(
    "-10,00",
  );
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Anular compra" }),
  );
  expect(api.annulExpense).not.toHaveBeenCalled();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Confirmar anulación" }),
  );
  await waitFor(() => expect(api.annulExpense).toHaveBeenCalledWith("b"));
});
it("shows multiple acquisition origins for copies of the same card", async () => {
  vi.mocked(api.getPurchaseProvenance).mockResolvedValue({
    ok: true,
    data: [
      {
        id: "a",
        name: "Precon",
        origin: "other",
        seller: "Tienda",
        acquiredOn: "2025-01-01",
        quantity: 1,
        costAmount: 10,
        costBasis: "allocated",
      },
      {
        id: "b",
        name: "Compra",
        origin: "cardmarket",
        seller: "Seller",
        acquiredOn: "2026-01-01",
        quantity: 2,
        costAmount: 20,
        costBasis: "paid",
      },
    ],
  });
  render(<CardPurchaseProvenance collectionCardId="c" />);
  await screen.findByText(/1 copias · Precon/);
  expect(screen.getByText(/2 copias · Compra/)).toBeInTheDocument();
  expect(api.getPurchaseProvenance).toHaveBeenCalledWith("c");
});
