"use client";
import { useState } from "react";
import type { SimulatedCollectionAnalysisResponse } from "@/actions/simulated-collections";
import {
  HistoricalPriceSummary,
  historicalPrice,
} from "@/components/historical-price-summary";

export function SimulatedHistorySummary({
  analysis,
}: {
  analysis: SimulatedCollectionAnalysisResponse;
}) {
  const [expanded, setExpanded] = useState(false);
  if (analysis.purchaseAnalysis) return null;
  return (
    <div className="space-y-3">
      <HistoricalPriceSummary
        label="Histórico global de la oferta"
        statistics={analysis.historyStatistics}
      />
      <p className="text-xs text-muted-foreground">
        Cardmarket EUR, no foil, de las impresiones de referencia. Todo el
        histórico disponible; el total se calcula con las cantidades en fechas
        comunes para todas las cartas. Las referencias sin edición seleccionada
        son aproximadas. Cobertura: {analysis.historyCoveredCopies ?? 0} copias
        con histórico; {analysis.missingHistoryCopies ?? 0} sin histórico.
      </p>
      <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer py-3 text-sm font-medium">
          Media y desviación por carta
        </summary>
        {expanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Estadísticas históricas por carta
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="p-2">
                    Carta
                  </th>
                  <th scope="col" className="p-2">
                    Media histórica / ud.
                  </th>
                  <th scope="col" className="p-2">
                    Desviación típica / ud.
                  </th>
                  <th scope="col" className="p-2">
                    Fechas
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.cards.map((card, index) => (
                  <tr
                    key={`${card.cardName}:${index}`}
                    className="border-t border-border"
                  >
                    <th scope="row" className="p-2 font-medium">
                      {card.cardName}
                    </th>
                    <td className="p-2 tabular-nums">
                      {historicalPrice(card.historyStatistics?.mean)}
                    </td>
                    <td className="p-2 tabular-nums">
                      {historicalPrice(
                        card.historyStatistics?.standardDeviation,
                      )}
                    </td>
                    <td className="p-2 tabular-nums">
                      {card.historyStatistics?.observations ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}
