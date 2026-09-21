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
import { Sparkles, Calendar, Layers, Eye, EyeOff } from "lucide-react";

const SERIES_COLORS = [
  "#38bdf8", // Sky blue
  "#f43f5e", // Rose
  "#10b981", // Emerald
  "#a855f7", // Purple
  "#eab308", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#f97316", // Orange
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
        const row = byDate.get(dateKey) ?? { date: dateKey };
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

  // Map each expansion release to the closest date in chartData
  const expansionMarkers = useMemo(() => {
    if (!showExpansions || dateList.length === 0 || expansions.length === 0) return [];

    const minDate = dateList[0];
    const maxDate = dateList[dateList.length - 1];

    const markers: Array<{
      expansion: CardExpansionRelease;
      chartDate: string;
      exactDate: string;
    }> = [];

    for (const exp of expansions) {
      if (!exp.releasedAt) continue;
      const expDate = exp.releasedAt.slice(0, 10);

      // Only show markers for expansions within or near the chart timeline
      if (expDate < minDate || expDate > maxDate) continue;

      // Find closest date in dateList
      let closestDate = dateList[0];
      let minDiff = Math.abs(new Date(expDate).getTime() - new Date(closestDate).getTime());

      for (const d of dateList) {
        const diff = Math.abs(new Date(expDate).getTime() - new Date(d).getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestDate = d;
        }
      }

      markers.push({
        expansion: exp,
        chartDate: closestDate,
        exactDate: expDate,
      });
    }

    return markers;
  }, [showExpansions, dateList, expansions]);

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        // Keep at least one series visible
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

        {/* Expansion / Reprints toggle */}
        {expansions.length > 0 && (
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showExpansions}
              onChange={(e) => setShowExpansions(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 bg-background"
            />
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Marcadores de expansiones / reprints
            </span>
          </label>
        )}
      </div>

      {/* Hovered expansion preview pill */}
      {hoveredExpansion && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 animate-in fade-in duration-150">
          <img
            src={`https://svgs.scryfall.io/sets/${hoveredExpansion.setCode.toLowerCase()}.svg`}
            alt={hoveredExpansion.setCode}
            className="w-4 h-4 object-contain invert dark:invert-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <span className="font-semibold">{hoveredExpansion.setName}</span>
          <span className="text-amber-300/70 font-mono">
            [{hoveredExpansion.setCode.toUpperCase()} #{hoveredExpansion.collectorNumber}]
          </span>
          {hoveredExpansion.releasedAt && (
            <span className="text-amber-300/70">
              · Lanzamiento:{" "}
              {new Date(hoveredExpansion.releasedAt).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {hoveredExpansion.trendPrice != null && (
            <span className="ml-auto font-mono font-bold text-foreground">
              {hoveredExpansion.trendPrice.toFixed(2)} {currencySymbol}
            </span>
          )}
        </div>
      )}

      {/* Main Chart Area */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222733" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#8b929e", fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(String(v));
                return Number.isNaN(d.getTime())
                  ? String(v)
                  : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
              }}
              stroke="#222733"
            />
            <YAxis
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
                const d = new Date(String(label));
                return Number.isNaN(d.getTime())
                  ? String(label)
                  : d.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    });
              }}
            />

            {/* MTGGoldfish Expansion Markers (Reference Lines) */}
            {expansionMarkers.map(({ expansion: exp, chartDate }) => (
              <ReferenceLine
                key={`exp-${exp.setCode}-${exp.collectorNumber}`}
                x={chartDate}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                label={
                  <CustomExpansionMarker
                    expansion={exp}
                    onHover={setHoveredExpansion}
                  />
                }
              />
            ))}

            {/* Line for each printing series */}
            {activeSeries.map((s, idx) => {
              const key = seriesKey(s);
              const isHidden = hiddenSeries.has(key);
              if (isHidden) return null;

              const isCurrent = s.printingId === activePrintingId;
              const color = isCurrent
                ? "#eab308"
                : SERIES_COLORS[idx % SERIES_COLORS.length];

              return (
                <Line
                  key={s.printingId}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={color}
                  strokeWidth={isCurrent ? 2.5 : 1.8}
                  dot={{ r: isCurrent ? 3.5 : 2.5, fill: color }}
                  activeDot={{ r: 5, stroke: "#000", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend with toggleable series */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] max-h-24 overflow-y-auto">
        {activeSeries.map((s, idx) => {
          const key = seriesKey(s);
          const isHidden = hiddenSeries.has(key);
          const isCurrent = s.printingId === activePrintingId;
          const color = isCurrent
            ? "#eab308"
            : SERIES_COLORS[idx % SERIES_COLORS.length];

          return (
            <button
              key={s.printingId}
              type="button"
              onClick={() => toggleSeries(key)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono transition-all text-[11px] ${
                isHidden
                  ? "bg-secondary/30 border-border/40 text-muted-foreground/50 line-through opacity-60"
                  : isCurrent
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold shadow-xs"
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

interface CustomExpansionMarkerProps {
  viewBox?: { x: number; y: number; width?: number; height?: number };
  expansion: CardExpansionRelease;
  onHover: (exp: CardExpansionRelease | null) => void;
}

function CustomExpansionMarker({
  viewBox,
  expansion,
  onHover,
}: CustomExpansionMarkerProps) {
  if (!viewBox) return null;
  const { x } = viewBox;
  const setCode = expansion.setCode.toLowerCase();

  return (
    <g
      transform={`translate(${x - 11}, 2)`}
      className="cursor-pointer"
      onMouseEnter={() => onHover(expansion)}
      onMouseLeave={() => onHover(null)}
    >
      <circle
        cx="11"
        cy="11"
        r="11"
        fill="#18181b"
        stroke="#f59e0b"
        strokeWidth="1.5"
        className="transition-transform hover:scale-125"
      />
      <image
        href={`https://svgs.scryfall.io/sets/${setCode}.svg`}
        x="3"
        y="3"
        width="16"
        height="16"
        className="invert dark:invert-0"
        onError={(e) => {
          (e.currentTarget as SVGElement).style.display = "none";
        }}
      />
    </g>
  );
}
