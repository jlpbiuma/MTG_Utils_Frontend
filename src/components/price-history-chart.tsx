"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { PrintingPriceSeries, CardExpansionRelease } from "@/lib/pricing/types";
import { Sparkles, Eye, EyeOff } from "lucide-react";

const SERIES_COLORS = [
  "#f97316", // MTGGoldfish Orange
  "#38bdf8", // Sky blue
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#eab308", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#94a3b8", // Slate
];

interface PriceHistoryChartProps {
  series: PrintingPriceSeries[];
  expansions?: CardExpansionRelease[];
  activePrintingId?: string;
  currencySymbol?: string;
  className?: string;
  height?: number;
  onSelectPrinting?: (printingId: string) => void;
}

function seriesKey(s: PrintingPriceSeries): string {
  const name = s.setName || s.setCode.toUpperCase();
  return `${name} #${s.collectorNumber}`;
}

export function PriceHistoryChart({
  series,
  expansions = [],
  activePrintingId,
  currencySymbol = "€",
  className = "",
  height = 300,
  onSelectPrinting,
}: PriceHistoryChartProps) {
  const [showExpansions, setShowExpansions] = useState(true);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredExpansion, setHoveredExpansion] = useState<CardExpansionRelease | null>(null);

  // Filter series that actually have points
  const activeSeries = useMemo(
    () => series.filter((s) => s.points.some((p) => p.trendPrice != null)),
    [series]
  );

  // Build chartData keyed by date
  const { chartData, dateList } = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number | null>>();
    for (const s of activeSeries) {
      const key = seriesKey(s);
      for (const point of s.points) {
        if (point.trendPrice == null) continue;
        const dateKey = new Date(point.recordedAt).toISOString().slice(0, 10);
        const row = byDate.get(dateKey) ?? { date: dateKey, timestamp: Date.parse(dateKey) };
        row[key] = Number(point.trendPrice);
        byDate.set(dateKey, row);
      }
    }
    const sorted = Array.from(byDate.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
    const dates = sorted.map((d) => String(d.date));
    return { chartData: sorted, dateList: dates };
  }, [activeSeries]);

  // Compute min and max price for Y-positioning and scaling
  const { minPrice, maxPrice } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const row of chartData) {
      for (const s of activeSeries) {
        const k = seriesKey(s);
        if (hiddenSeries.has(k)) continue;
        const val = row[k];
        if (typeof val === "number" && !isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    if (min === Infinity) min = 0;
    if (max === -Infinity) max = 1;
    const padding = (max - min) * 0.1 || 0.1;
    return {
      minPrice: Math.max(0, min - padding * 0.5),
      maxPrice: max + padding,
    };
  }, [chartData, activeSeries, hiddenSeries]);

  // Releases use their actual timestamp, including days with no price sample.
  const expansionMarkers = useMemo(() => {
    if (!showExpansions || !dateList.length) return [];
    return expansions.filter((exp) => {
      const date = exp.releasedAt?.slice(0, 10);
      return date && date >= dateList[0] && date <= dateList[dateList.length - 1];
    }).toSorted((a, b) => a.releasedAt!.localeCompare(b.releasedAt!));
  }, [showExpansions, dateList, expansions]);

  const releaseDates = [...new Set(expansionMarkers.map((exp) => exp.releasedAt!.slice(0, 10)))];

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size < activeSeries.length - 1) {
          next.add(key);
        }
      }
      return next;
    });
  };

  const showOnlyActive = () => {
    if (!activePrintingId) return;
    const target = activeSeries.find((s) => s.printingId === activePrintingId);
    if (!target) return;
    const targetKey = seriesKey(target);
    const newHidden = new Set<string>();
    for (const s of activeSeries) {
      const k = seriesKey(s);
      if (k !== targetKey) newHidden.add(k);
    }
    setHiddenSeries(newHidden);
  };

  const showAll = () => {
    setHiddenSeries(new Set());
  };

  if (activeSeries.length === 0 || chartData.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground ${className}`}
        style={{ minHeight: height }}
      >
        Sin histórico de precios en el periodo seleccionado.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Chart controls bar (MTGGoldfish style) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          {activePrintingId && (
            <div className="flex items-center gap-1.5 bg-background/80 border border-border/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={showOnlyActive}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Mostrar solo la versión seleccionada"
              >
                Solo seleccionada
              </button>
              <button
                type="button"
                onClick={showAll}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Mostrar todas las versiones"
              >
                Todas ({activeSeries.length})
              </button>
            </div>
          )}
        </div>

        {/* Expansion / Reprints toggle (MTGGoldfish style) */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showExpansions}
              onChange={(e) => { setShowExpansions(e.target.checked); setHoveredExpansion(null); }}
              className="rounded border-border text-orange-500 focus:ring-orange-500 h-3.5 w-3.5 bg-background"
            />
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 text-orange-400" />
              Lanzamientos de expansión ({expansionMarkers.length})
            </span>
          </label>

          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-muted-foreground pl-2 border-l border-border/60">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
              Nueva expansión
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Versión carta
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#222733" strokeOpacity={0.6} />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              minTickGap={30}
              tick={{ fill: "#8b929e", fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(Number(v));
                return Number.isNaN(d.getTime())
                  ? String(v)
                  : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
              }}
              stroke="#222733"
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              tick={{ fill: "#8b929e", fontSize: 11 }}
              stroke="#222733"
              width={60}
              tickFormatter={(v) => {
                const num = Number(v);
                if (num >= 100) return `${num.toFixed(0)} ${currencySymbol}`;
                if (num >= 10) return `${num.toFixed(1)} ${currencySymbol}`;
                return `${num.toFixed(2)} ${currencySymbol}`;
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#0d1117",
                border: "1px solid #30363d",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "#f0f6fc", fontWeight: 600, marginBottom: 4 }}
              formatter={(value, name) => [
                `${Number(value ?? 0).toFixed(2)} ${currencySymbol}`,
                String(name),
              ]}
              labelFormatter={(label) => {
                const d = new Date(Number(label));
                return Number.isNaN(d.getTime())
                  ? String(label)
                  : d.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    });
              }}
            />

            {releaseDates.map((date) => {
              const highlighted = hoveredExpansion?.releasedAt?.slice(0, 10) === date;
              return (
                <ReferenceLine
                  key={date}
                  x={Date.parse(date)}
                  stroke={highlighted ? "#f59e0b" : "#64748b"}
                  strokeOpacity={highlighted ? 1 : 0.4}
                  strokeWidth={highlighted ? 2 : 1}
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Line for each printing series */}
            {activeSeries.map((s, idx) => {
              const key = seriesKey(s);
              const isHidden = hiddenSeries.has(key);
              if (isHidden) return null;

              const isCurrent = s.printingId === activePrintingId;
              const color = isCurrent
                ? "#f97316" // MTGGoldfish signature orange
                : SERIES_COLORS[(idx + 1) % SERIES_COLORS.length];

              return (
                <Line
                  key={s.printingId}
                  type="linear"
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeWidth={isCurrent ? 2.5 : 1.8}
                  dot={false}
                  activeDot={{ r: 5, stroke: "#000", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {expansionMarkers.length > 0 && (
        <section aria-label="Lanzamientos en el período" className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">Lanzamientos · pasa el cursor o enfoca una expansión para localizar su fecha</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {expansionMarkers.map((exp) => (
              <button
                key={`${exp.setCode}-${exp.releasedAt}-${exp.printingId || "set"}`}
                type="button"
                aria-label={`${exp.setCode.toUpperCase()} ${exp.setName} · Lanzamiento ${exp.releasedAt!.slice(0, 10)}${exp.hasPrinting ? " · Versión de esta carta" : ""}`}
                onMouseEnter={() => setHoveredExpansion(exp)}
                onMouseLeave={() => setHoveredExpansion(null)}
                onFocus={() => setHoveredExpansion(exp)}
                onBlur={() => setHoveredExpansion(null)}
                onClick={() => {
                  setHoveredExpansion(exp);
                  if (exp.printingId) onSelectPrinting?.(exp.printingId);
                }}
                className={`flex min-h-11 items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${hoveredExpansion === exp ? "border-amber-500/60 bg-amber-500/10" : "border-border hover:bg-secondary"}`}
              >
                <span className={`shrink-0 rounded border px-1.5 py-1 font-mono text-[10px] ${exp.hasPrinting ? "text-amber-400 border-amber-400/30" : "text-orange-400 border-orange-400/30"}`}>
                  {exp.setCode.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground break-words">{exp.setName}</span>
                  <span className="block text-muted-foreground">
                    {new Date(exp.releasedAt!).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                    {exp.hasPrinting ? " · Versión de esta carta" : " · Nueva expansión"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Interactive Legend with toggleable series */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] max-h-24 overflow-y-auto">
        {activeSeries.map((s, idx) => {
          const key = seriesKey(s);
          const isHidden = hiddenSeries.has(key);
          const isCurrent = s.printingId === activePrintingId;
          const color = isCurrent
            ? "#f97316"
            : SERIES_COLORS[(idx + 1) % SERIES_COLORS.length];

          return (
            <button
              key={s.printingId}
              type="button"
              onClick={() => toggleSeries(key)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono transition-all text-[11px] ${
                isHidden
                  ? "bg-secondary/30 border-border/40 text-muted-foreground/50 line-through opacity-60"
                  : isCurrent
                  ? "bg-orange-500/15 border-orange-500/50 text-orange-300 font-semibold shadow-xs"
                  : "bg-secondary/80 border-border text-foreground hover:bg-accent"
              }`}
              title={`Clic para ${isHidden ? "mostrar" : "ocultar"} ${key}`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isHidden ? "#555" : color }}
              />
              <span className="truncate max-w-[160px]">{key}</span>
              {isHidden ? (
                <EyeOff className="w-2.5 h-2.5 ml-0.5 text-muted-foreground/50" />
              ) : (
                <Eye className="w-2.5 h-2.5 ml-0.5 text-muted-foreground/80 opacity-0 group-hover:opacity-100" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
