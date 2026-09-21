"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, RefreshCw, Layers } from "lucide-react";
import { getCollectionPriceHistory } from "@/actions/pricing";
import type { CollectionValueHistoryResponse, CollectionValueHistoryPoint, PriceProvider } from "@/lib/pricing/types";
import { formatPrice } from "@/lib/deck-colors";

interface CollectionValueChartProps {
  provider: PriceProvider;
}

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1A", days: 365 },
  { label: "Todo", days: 3650 },
];

export function CollectionValueChart({ provider }: CollectionValueChartProps) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<CollectionValueHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await getCollectionPriceHistory(provider, days);
      setData(res);
    } catch (err) {
      console.error("Error loading collection value history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [provider, days]);

  const points = data?.points || [];
  const symbol = data?.currencySymbol || "€";
  const currentValue = data?.currentValue ?? 0;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const baselineValue = firstPoint ? firstPoint.totalValue : currentValue;
  const changeAbs = currentValue - baselineValue;
  const changePct = baselineValue > 0 ? (changeAbs / baselineValue) * 100 : 0;
  const isUp = changeAbs >= 0;

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Evolución del Valor de la Colección
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
              {provider.toUpperCase()}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
            <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
              {formatPrice(currentValue, symbol)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold font-mono px-2 py-0.5 rounded-md ${
                isUp
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                  : "bg-rose-950/60 text-rose-300 border border-rose-800/60"
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isUp ? "+" : ""}{formatPrice(changeAbs, symbol)}</span>
              <span>({isUp ? "+" : ""}{changePct.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-background border border-border rounded-lg p-0.5 text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-2.5 py-1 rounded-md font-mono text-xs transition-all ${
                  days === opt.days
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadHistory()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Recargar gráfico"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {isLoading && points.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">Cargando serie temporal...</span>
        </div>
      ) : points.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground border border-dashed border-border rounded-lg">
          <Calendar className="w-8 h-8 text-muted-foreground/40" />
          <span className="text-xs">Sin datos históricos para este periodo</span>
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={isUp ? "#10b981" : "#f43f5e"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#71717a"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickFormatter={(val) => `${Number(val).toFixed(val < 10 ? 2 : 0)} ${symbol}`}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip symbol={symbol} />} />
              <Area
                type="monotone"
                dataKey="totalValue"
                stroke={isUp ? "#10b981" : "#f43f5e"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={{ r: 5, fill: isUp ? "#10b981" : "#f43f5e", stroke: "#09090b", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label, symbol }: any) {
  if (active && payload && payload.length) {
    const pt: CollectionValueHistoryPoint = payload[0].payload;
    let formattedDate = label;
    try {
      formattedDate = new Date(pt.date).toLocaleDateString("es-ES", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {}

    return (
      <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
        <p className="text-[11px] text-muted-foreground font-medium capitalize">{formattedDate}</p>
        <p className="text-base font-bold font-mono text-foreground">
          {formatPrice(pt.totalValue, symbol)}
        </p>
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] pt-1 border-t border-border/50">
          <Layers className="w-3 h-3 text-primary" />
          <span>{pt.ownedCards} cartas registradas</span>
        </div>
      </div>
    );
  }
  return null;
}
