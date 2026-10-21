import { render, screen, within, fireEvent } from "@testing-library/react";
import { describe, it } from "vitest";
import { HistoricalPriceSummary } from "@/components/historical-price-summary";
import { SimulatedPurchaseComparison } from "@/components/simulated-purchase-comparison";
import { SimulatedHistorySummary } from "@/components/simulated-history-summary";
import responseJson from "../fixtures/cardmarket/list-3-analysis.json";
import type { SimulatedCollectionAnalysisResponse } from "@/actions/simulated-collections";
import type { PriceHistoryStatistics } from "@/lib/pricing/types";
import { expect } from "vitest";

const statistics: PriceHistoryStatistics = {
  mean: 12,
  standardDeviation: 1,
  observations: 2,
  firstObservedOn: "2020-01-01",
  lastObservedOn: "2026-10-01",
  provider: "cardmarket",
  currency: "EUR",
};
const response = responseJson as SimulatedCollectionAnalysisResponse;

describe("all-time historical price statistics", () => {
  it("shows missing history instead of a zero estimate and explains a single observation", () => {
    const view = render(<HistoricalPriceSummary label="Histórico" />);
    expect(screen.getAllByText("Sin datos")).toHaveLength(2);
    view.rerender(
      <HistoricalPriceSummary
        label="Histórico"
        statistics={{ ...statistics, observations: 1, standardDeviation: 0 }}
      />,
    );
    expect(
      screen.getByText(/Una sola fecha no permite valorar la fluctuación/),
    ).toBeInTheDocument();
  });
  it("shows the global total separately from unit statistics and their coverage", () => {
    const purchase = response.purchaseAnalysis!;
    render(
      <SimulatedPurchaseComparison
        analysis={{
          ...purchase,
          historyStatistics: statistics,
          historyCoveredCopies: 2,
          missingHistoryCopies: 0,
          cards: [
            {
              ...purchase.cards[0],
              cardName: "Carta histórica",
              historyStatistics: {
                ...statistics,
                mean: 2,
                standardDeviation: 0.5,
              },
            },
          ],
        }}
      />,
    );
    const global = screen.getByRole("region", {
      name: "Histórico global de la oferta",
    });
    expect(within(global).getByText(/12,00/)).toBeInTheDocument();
    const row = screen.getByRole("row", { name: /Carta histórica/ });
    expect(within(row).getAllByRole("cell")[3]).toHaveTextContent("2,00");
    expect(within(row).getByText(/0,50/)).toBeInTheDocument();
    expect(
      screen.getByText(/No se suman las desviaciones individuales/),
    ).toBeInTheDocument();
  });
  it("includes statistics in a simple pasted list without seller prices", async () => {
    render(
      <SimulatedHistorySummary
        analysis={{
          ...response,
          purchaseAnalysis: null,
          historyStatistics: statistics,
          cards: [
            {
              ...response.cards[0],
              cardName: "Lista sencilla",
              historyStatistics: statistics,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("region", { name: "Histórico global de la oferta" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Media y desviación por carta"));
    expect(
      await screen.findByRole("row", { name: /Lista sencilla/ }),
    ).toHaveTextContent("12,00");
  });
});
