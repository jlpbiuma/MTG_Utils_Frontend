import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi, beforeEach } from "vitest";
import { HistoricalPurchaseDialog } from "@/components/historical-purchase-dialog";
import * as api from "@/actions/acquisitions";
vi.mock("@/actions/acquisitions", () => ({
  validatePurchaseList: vi.fn(),
  prepareHistoricalPurchase: vi.fn(),
  commitPurchase: vi.fn(),
}));
const candidate = {
  collectionCardId: "c1",
  cardName: "Sol Ring",
  printingId: "p1",
  setCode: "c21",
  collectorNumber: "1",
  setName: "Commander",
  isFoil: false,
  availableQuantity: 1,
  currentPrice: 10,
};
beforeEach(() => vi.resetAllMocks());
it("requires price and date and corrects an invalid name dynamically", async () => {
  vi.mocked(api.validatePurchaseList)
    .mockResolvedValueOnce({
      ok: true,
      data: {
        valid: false,
        lines: [
          {
            line: 1,
            raw: "1 Sol Rign",
            name: "Sol Rign",
            quantity: 1,
            error: "Nombre no encontrado en tu colección",
            candidates: [],
            suggestions: ["Sol Ring"],
          },
        ],
      },
    })
    .mockResolvedValue({
      ok: true,
      data: {
        valid: true,
        lines: [
          {
            line: 1,
            raw: "1 Sol Ring",
            name: "Sol Ring",
            quantity: 1,
            error: null,
            candidates: [candidate],
            suggestions: [],
          },
        ],
      },
    });
  render(<HistoricalPurchaseDialog onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: "1 Sol Rign" },
  });
  expect(
    (await screen.findAllByText("Nombre no encontrado en tu colección"))[0],
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Usar Sol Ring" }));
  await waitFor(() =>
    expect(screen.getByText("Nombre reconocido")).toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Revisar compra" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Nombre del lote o producto"), {
    target: { value: "Precon" },
  });
  fireEvent.change(screen.getByLabelText("Precio total pagado (€)"), {
    target: { value: "40" },
  });
  expect(screen.getByRole("button", { name: "Revisar compra" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Fecha de adquisición"), {
    target: { value: "2025-01-02" },
  });
  expect(screen.getByRole("button", { name: "Revisar compra" })).toBeEnabled();
});
