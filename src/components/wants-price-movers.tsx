"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { CardImage as Image } from "@/components/card-image";
import { getPriceMovers } from "@/actions/pricing";
import type { PriceMoversResponse, PriceProvider, PriceMoverItem } from "@/lib/pricing/types";
import { formatPrice } from "@/lib/deck-colors";

interface WantsPriceMoversProps {
  provider: PriceProvider;
  onSelectCard?: (cardName: string) => void;
}

export function WantsPriceMovers({ provider, onSelectCard }: WantsPriceMoversProps) {
  const [windowDays, setWindowDays] = useState<number>(30);
  const [data, setData] = useState<PriceMoversResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const loadMovers = async () => {
    setIsLoading(true);
    try {
      const res = await getPriceMovers({
        provider,
        windowDays,
        limit: 8,
        scope: "wants",
      });
      setData(res);
    } catch (err) {
      console.error("Error loading wants price movers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMovers();
  }, [provider, windowDays]);

  const hasMovers = (data?.gainers?.length ?? 0) > 0 || (data?.losers?.length ?? 0) > 0;

  if (!hasMovers && !isLoading) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all shadow-sm">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 bg-secondary/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Tendencias en tus Wants
              <span className="text-xs font-normal text-muted-foreground font-mono">
                ({windowDays} días)
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Subidas y bajadas de precio detectadas en tu lista de deseos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-background border border-border rounded-lg p-0.5 text-xs">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setWindowDays(days)}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all ${
                  windowDays === days
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <button
            onClick={() => loadMovers()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Recargar tendencias"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={isCollapsed ? "Expandir tendencias" : "Plegar tendencias"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subidas (Gainers) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span>Mayores Subidas</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (Se están encareciendo)
              </span>
            </div>

            <div className="space-y-2">
              {data?.gainers && data.gainers.length > 0 ? (
                data.gainers.slice(0, 4).map((item) => renderMoverItem(item, "up", data.currencySymbol))
              ) : (
                <p className="text-xs text-muted-foreground py-2 italic font-mono">
                  Sin variaciones al alza significativas en este periodo
                </p>
              )}
            </div>
          </div>

          {/* Bajadas / Oportunidades (Losers) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
              <TrendingDown className="w-4 h-4" />
              <span>Oportunidades de Compra (Bajadas)</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (Precios a la baja)
              </span>
            </div>

            <div className="space-y-2">
              {data?.losers && data.losers.length > 0 ? (
                data.losers.slice(0, 4).map((item) => renderMoverItem(item, "down", data.currencySymbol))
              ) : (
                <p className="text-xs text-muted-foreground py-2 italic font-mono">
                  Sin variaciones a la baja significativas en este periodo
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderMoverItem(item: PriceMoverItem, direction: "up" | "down", symbol: string) {
    const isUp = direction === "up";
    return (
      <div
        key={item.printingId}
        onClick={() => onSelectCard?.(item.cardName)}
        className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/60 bg-background/60 hover:bg-accent/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-11 rounded overflow-hidden bg-secondary shrink-0 border border-border/40">
            {item.imageUri ? (
              <Image src={item.imageUri} alt={item.cardName} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                MTG
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-foreground truncate">{item.cardName}</h4>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              <span>{formatPrice(item.baselinePrice, symbol)}</span>
              <span>→</span>
              <span className="font-bold text-foreground">{formatPrice(item.currentPrice, symbol)}</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
              isUp
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
            }`}
          >
            {isUp ? "+" : ""}
            {item.changePct.toFixed(1)}%
          </span>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {isUp ? "+" : ""}
            {formatPrice(item.changeAbs, symbol)}
          </p>
        </div>
      </div>
    );
  }
}
