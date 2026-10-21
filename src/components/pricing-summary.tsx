"use client";


import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { PriceSummary } from "@/lib/pricing";

interface PricingSummaryProps {
  summary?: PriceSummary | null;
  isLoading?: boolean;
  showMissingNetValue?: boolean;
  showValueSummary?: boolean;
  className?: string;
}

export function PricingSummary({
  summary,
  isLoading = false,
  showMissingNetValue = true,
  showValueSummary = true,
  className = "",
}: PricingSummaryProps) {
  const currencySymbol = summary?.currencySymbol ?? "€";

  return (
    <div className={`p-4 rounded-lg border border-border bg-card ${className}`}>
      <p className={`text-xs font-medium text-muted-foreground ${showValueSummary ? "pb-3 border-b border-border" : ""}`}>Cardmarket (€)</p>

      {/* Bottom row: Net Value KPIs */}
      {showValueSummary && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3">
        {/* Total Net Value */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground">Precio Neto Total (Cardmarket)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {isLoading && !summary ? (
              <span className="text-sm text-muted-foreground animate-pulse">Cargando precios…</span>
            ) : (
              <>
                <span className="text-xl font-semibold font-mono text-primary">
                  {summary ? summary.totalNetValue.toFixed(2) : "—"}
                </span>
                <span className="text-xs font-mono text-primary">{currencySymbol}</span>
              </>
            )}
          </div>
          {isLoading && summary ? (
            <span className="text-[10px] text-muted-foreground mt-0.5">Actualizando…</span>
          ) : null}
          {!isLoading && !summary && showValueSummary ? (
            <span className="text-[10px] text-amber-600 mt-0.5">No se pudieron cargar los precios</span>
          ) : null}
        </div>

        {/* Missing Cards Value (Cost to finish deck) */}
        {showMissingNetValue && (
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3 w-3 text-rose-400" />
              Coste Faltantes (Completar Mazo)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              {isLoading && !summary ? (
                <span className="text-sm text-muted-foreground animate-pulse">…</span>
              ) : (
                <>
                  <span className="text-xl font-semibold font-mono text-rose-400">
                    {summary ? (summary.totalMissingValue ?? 0).toFixed(2) : "—"}
                  </span>
                  <span className="text-xs font-mono text-rose-500">{currencySymbol}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Owned Value in Physical Collection */}
        {(!summary || summary.totalOwnedValue == null || Math.abs(summary.totalOwnedValue - summary.totalNetValue) > 0.005) && <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Valor en Posesión
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {isLoading && !summary ? (
              <span className="text-sm text-muted-foreground animate-pulse">…</span>
            ) : (
              <>
                <span className="text-xl font-semibold font-mono text-emerald-400">
                  {summary
                    ? (
                        summary.totalOwnedValue ??
                        Math.max(0, summary.totalNetValue - (summary.totalMissingValue ?? 0))
                      ).toFixed(2)
                    : "—"}
                </span>
                <span className="text-xs font-mono text-emerald-500">{currencySymbol}</span>
              </>
            )}
          </div>
        </div>}
      </div>
      )}
    </div>
  );
}
