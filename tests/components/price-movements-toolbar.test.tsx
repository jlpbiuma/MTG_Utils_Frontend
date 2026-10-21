import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PriceHistoryView } from "@/components/price-history-view";
import type { PriceMoverItem, PriceMoversResponse } from "@/lib/pricing/types";

vi.mock("@/components/card-detail-dialog", () => ({CardDetailDialog: () => null}));
vi.mock("@/actions/pricing", () => ({getPriceMovers: vi.fn()}));
const item = (cardName: string, changePct: number): PriceMoverItem => ({
  printingId:cardName,cardName,provider:"cardmarket",currency:"EUR",currencySymbol:"€",
  currentPrice:10,baselinePrice:5,changeAbs:5,changePct,baselineAt:"2026-09-01",currentAt:"2026-09-30",
});
const market: PriceMoversResponse = {provider:"cardmarket",currency:"EUR",currencySymbol:"€",windowDays:30,scope:"global",generatedAt:"2026-09-30",gainers:[item("Alpha",10),item("Beta",20)],losers:[item("Gamma",-30)]};
it("searches and sorts price movements while keeping the selected filters across display changes", () => {
  const {container} = render(<PriceHistoryView initialMarket={market} initialCollection={{...market,scope:"collection"}} />);
  const toolbar=within(screen.getByRole("region",{name:"Opciones de los movimientos de precios"}));
  const scope=within(screen.getByRole("region",{name:"Mercado (30 días)"}));
  expect(container.querySelector("select")).toBeNull();
  fireEvent.click(within(toolbar.getByRole("group",{name:"Ordenar por"})).getByRole("button",{name:"Nombre"}));
  const alpha=scope.getByText("Alpha");
  const beta=scope.getByText("Beta");
  expect(alpha.compareDocumentPosition(beta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(toolbar.getByRole("button",{name:"Bajadas"}));
  expect(scope.queryByText("Alpha")).not.toBeInTheDocument();
  expect(scope.getByText("Gamma")).toBeInTheDocument();
  fireEvent.change(toolbar.getByRole("searchbox"),{target:{value:"Gamma"}});
  fireEvent.click(toolbar.getByRole("button",{name:"Lista"}));
  expect(toolbar.getByRole("button",{name:"Bajadas"})).toHaveAttribute("aria-pressed","true");
  expect(toolbar.getByRole("searchbox")).toHaveValue("Gamma");
  expect(scope.getByText("Gamma")).toBeInTheDocument();
  fireEvent.change(toolbar.getByRole("searchbox"),{target:{value:"no match"}});
  expect(scope.getByText("No hay cartas que coincidan con los filtros.")).toBeInTheDocument();
});
