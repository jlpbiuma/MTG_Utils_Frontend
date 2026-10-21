import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import raw from "../fixtures/acquisitions/tmnt-precon.txt?raw";
import diagnostics from "../fixtures/acquisitions/tmnt-inventory-diagnostics.json";
import { HistoricalPurchaseDialog } from "@/components/historical-purchase-dialog";
import * as api from "@/actions/acquisitions";
import { purchaseQuote } from "../fixtures/acquisition";
import type { PurchaseListValidation } from "@/lib/acquisitions";
vi.mock("@/actions/acquisitions", () => ({
  validatePurchaseList: vi.fn(),
  prepareHistoricalPurchase: vi.fn(),
  commitPurchase: vi.fn(),
}));
const validation: PurchaseListValidation = {
  valid: false,
  lines: raw
    .trim()
    .split("\n")
    .map((text, index) => {
      const problem = diagnostics.problems.find((p) => p.line === index + 1);
      return {
        line: index + 1,
        raw: text,
        name: text.slice(text.indexOf(" ") + 1),
        quantity: Number(text.split(" ")[0]),
        error: problem
          ? (problem.errorCode === "printing_unresolved"
              ? "Falta resolver la edición de "
              : "No está en la colección: ") + problem.name
          : null,
        errorCode: problem?.errorCode ?? null,
        candidates:
          problem?.errorCode === "name_not_owned"
            ? []
            : [
                {
                  collectionCardId: `c${index}`,
                  cardName: text.slice(text.indexOf(" ") + 1),
                  printingId:
                    problem?.errorCode === "printing_unresolved"
                      ? null
                      : `p${index}`,
                  setCode: "tmt",
                  collectorNumber: String(index),
                  setName: "Turtles",
                  isFoil: false,
                  availableQuantity: Number(text.split(" ")[0]),
                  currentPrice: null,
                },
              ],
        suggestions: [],
      };
    }),
};
beforeEach(() => vi.resetAllMocks());
it("shows real validation state and puts the problematic card before the long 100-card list", async () => {
  let resolve!: (
    result: Awaited<ReturnType<typeof api.validatePurchaseList>>,
  ) => void;
  vi.mocked(api.validatePurchaseList).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<HistoricalPurchaseDialog onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: raw },
  });
  const progress = screen.getByRole("progressbar", {
    name: "Validación de cartas",
  });
  expect(progress).not.toHaveAttribute("aria-valuenow");
  await waitFor(() =>
    expect(api.validatePurchaseList).toHaveBeenCalledWith(raw),
  );
  resolve({ ok: true, data: validation });
  const summary = await screen.findByRole("region", {
    name: "Cartas que requieren atención",
  });
  for (const problem of diagnostics.problems) {
    expect(summary).toHaveTextContent(`Línea ${problem.line}: ${problem.name}`);
  }
  expect(progress).toHaveAttribute("aria-valuenow", String((88 / 93) * 100));
  expect(screen.getByRole("status")).toHaveTextContent(
    "93 líneas comprobadas · 100 copias · 88 listas · 5 con problemas",
  );
  expect(
    summary.compareDocumentPosition(
      screen.getByRole("list", { name: "Validación del listado" }),
    ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  fireEvent.click(
    within(summary).getByRole("button", {
      name: "Ir a línea 24: Double Jump/Flying Kick",
    }),
  );
  expect(document.activeElement).toHaveAttribute("id", "historical-line-24");
  expect(screen.getByRole("button", { name: "Revisar compra" })).toBeDisabled();
});
it("stops indeterminate progress after a request failure and allows retry without editing the list", async () => {
  vi.mocked(api.validatePurchaseList)
    .mockResolvedValueOnce({
      ok: false,
      error: "No se pudo validar el listado",
    })
    .mockResolvedValue({ ok: true, data: validation });
  render(<HistoricalPurchaseDialog onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: raw },
  });
  await screen.findByText("No se pudo validar el listado");
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  fireEvent.click(
    screen.getByRole("button", { name: "Reintentar validación" }),
  );
  await screen.findByRole("region", { name: "Cartas que requieren atención" });
  expect(api.validatePurchaseList).toHaveBeenCalledTimes(2);
});

it("ignores the old 100-card response after the pasted list changes", async () => {
  let oldResolve!: (
    result: Awaited<ReturnType<typeof api.validatePurchaseList>>,
  ) => void;
  vi.mocked(api.validatePurchaseList)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
    )
    .mockResolvedValue({
      ok: true,
      data: {
        valid: true,
        lines: [
          {
            ...validation.lines[0],
            name: "Sol Ring",
            raw: "1 Sol Ring",
            error: null,
            candidates: [
              { ...validation.lines[0].candidates[0], cardName: "Sol Ring" },
            ],
          },
        ],
      },
    });
  render(<HistoricalPurchaseDialog onClose={vi.fn()} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: raw },
  });
  await waitFor(() =>
    expect(api.validatePurchaseList).toHaveBeenCalledTimes(1),
  );
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: "1 Sol Ring" },
  });
  await screen.findByText(
    "1 líneas comprobadas · 1 copias · 1 listas · 0 con problemas",
  );
  oldResolve({ ok: true, data: validation });
  await waitFor(() =>
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    ),
  );
  expect(
    screen.queryByRole("region", { name: "Cartas que requieren atención" }),
  ).toBeNull();
});

it("shows indeterminate progress while preparing and saving without claiming a percentage", async () => {
  let prepare!: (
    result: Awaited<ReturnType<typeof api.prepareHistoricalPurchase>>,
  ) => void;
  let commit!: (result: Awaited<ReturnType<typeof api.commitPurchase>>) => void;
  const saved = vi.fn();
  const closed = vi.fn();
  vi.mocked(api.validatePurchaseList).mockResolvedValue({
    ok: true,
    data: { valid: true, lines: [validation.lines[0]] },
  });
  vi.mocked(api.prepareHistoricalPurchase).mockImplementation(
    () =>
      new Promise((resolve) => {
        prepare = resolve;
      }),
  );
  vi.mocked(api.commitPurchase).mockImplementation(
    () =>
      new Promise((resolve) => {
        commit = resolve;
      }),
  );
  render(<HistoricalPurchaseDialog onClose={closed} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText("Listado de cartas"), {
    target: { value: "1 Acidic Slime" },
  });
  await screen.findByText("Nombre reconocido");
  fireEvent.change(screen.getByLabelText("Nombre del lote o producto"), {
    target: { value: "Precon" },
  });
  fireEvent.change(screen.getByLabelText("Precio total pagado (€)"), {
    target: { value: "40" },
  });
  fireEvent.change(screen.getByLabelText("Fecha de adquisición"), {
    target: { value: "2025-01-02" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar compra" }));
  expect(
    screen.getByRole("progressbar", { name: "Preparando compra" }),
  ).not.toHaveAttribute("aria-valuenow");
  prepare({ ok: true, data: purchaseQuote });
  const register = await screen.findByRole("button", {
    name: "Registrar compra",
  });
  fireEvent.click(register);
  expect(
    screen.getByRole("progressbar", { name: "Registrando compra" }),
  ).not.toHaveAttribute("aria-valuenow");
  expect(saved).not.toHaveBeenCalled();
  commit({ ok: true, data: { batchId: "batch", alreadyConfirmed: false } });
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(closed).toHaveBeenCalledOnce();
});
