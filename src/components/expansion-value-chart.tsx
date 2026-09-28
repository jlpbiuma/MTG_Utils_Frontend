"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { ExpansionValueHistory, ExpansionValuePoint } from "@/actions/expansions";

const formatPrice = (value: number) => new Intl.NumberFormat("es-ES", {
  style: "currency", currency: "EUR", maximumFractionDigits: 2,
}).format(value);
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "short", timeZone: "UTC",
});
const WIDTH = 1000;
const HEIGHT = 150;
const TOP = 12;
const BOTTOM = 138;

function linePath(values: number[], min: number, max: number) {
  const spread = max - min || 1;
  const coordinates = values.map((value, index) => ({
    x: 4 + (index / Math.max(values.length - 1, 1)) * (WIDTH - 8),
    y: BOTTOM - ((value - min) / spread) * (BOTTOM - TOP),
  }));
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  return { coordinates, path, area: `${path} L${WIDTH - 4},${HEIGHT} L4,${HEIGHT} Z` };
}

export function ExpansionValueChart({ history, days, onDaysChange }: {
  history: ExpansionValueHistory | null;
  days: number;
  onDaysChange: (days: number) => void;
}) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = history?.points ?? [];
  const values = points.flatMap((point) => [point.totalValue, point.ownedValue])
    .filter((value) => Number.isFinite(value) && value >= 0);
  const high = Math.max(...values, 0);
  const low = Math.min(...values, 0);
  const padding = (high - low) * 0.08 || high * 0.08 || 1;
  const min = Math.max(0, low - padding);
  const max = high + padding;
  const total = linePath(points.map((point) => point.totalValue), min, max);
  const owned = linePath(points.map((point) => point.ownedValue), min, max);
  const activePoint: ExpansionValuePoint | null = activeIndex == null ? null : points[activeIndex] ?? null;
  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;

  function selectNearestPoint(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !points.length) return;
    const x = (event.clientX - bounds.left) / bounds.width * WIDTH;
    const index = Math.round(((x - 4) / (WIDTH - 8)) * (points.length - 1));
    setActiveIndex(Math.max(0, Math.min(points.length - 1, index)));
  }

  return <section aria-label="Tendencia del valor de la expansión" className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 font-mono text-[11px]">
        <span className="text-muted-foreground">{days}D</span>
        <span className="text-rose-500">{formatPrice(history?.currentTotalValue ?? 0)}</span>
        <span className="text-emerald-500">{formatPrice(history?.currentOwnedValue ?? 0)}</span>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Periodo
        <select aria-label="Periodo del gráfico" value={days} onChange={(event) => onDaysChange(Number(event.target.value))} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
          {[7, 30, 90, 365].map((period) => <option key={period} value={period}>{period} días</option>)}
        </select>
      </label>
    </div>
    <div className="mb-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
      <span className="inline-flex items-center gap-1.5 text-rose-500"><span className="h-0.5 w-4 rounded-full bg-rose-500" />Valor total de la expansión</span>
      <span className="inline-flex items-center gap-1.5 text-emerald-500"><span className="h-0.5 w-4 rounded-full bg-emerald-500" />Valor en propiedad</span>
    </div>
    {points.length >= 2 ? <svg
      role="img"
      aria-label="Gráfica histórica del valor total y del valor en propiedad"
      preserveAspectRatio="none"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-36 w-full overflow-visible"
      onPointerMove={selectNearestPoint}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => setActiveIndex(points.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={(event: KeyboardEvent<SVGSVGElement>) => {
        if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && points.length) {
          event.preventDefault();
          setActiveIndex((index) => Math.max(0, Math.min(points.length - 1, (index ?? points.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
        }
      }}
      tabIndex={0}
    >
      <defs>
        <linearGradient id={`${gradientId}-total`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${gradientId}-owned`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={total.area} fill={`url(#${gradientId}-total)`} />
      <path d={owned.area} fill={`url(#${gradientId}-owned)`} />
      <path d={total.path} fill="none" stroke="#f43f5e" vectorEffect="non-scaling-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={owned.path} fill="none" stroke="#10b981" vectorEffect="non-scaling-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {activeIndex != null && <>
        <line x1={total.coordinates[activeIndex]?.x} x2={total.coordinates[activeIndex]?.x} y1={TOP} y2={HEIGHT} stroke="currentColor" vectorEffect="non-scaling-stroke" strokeOpacity="0.35" strokeDasharray="3 4" />
        <circle cx={total.coordinates[activeIndex]?.x} cy={total.coordinates[activeIndex]?.y} r="4" fill="#f43f5e" stroke="hsl(var(--card))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={owned.coordinates[activeIndex]?.x} cy={owned.coordinates[activeIndex]?.y} r="4" fill="#10b981" stroke="hsl(var(--card))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </>}
    </svg> : <div className="grid h-36 place-items-center text-xs text-muted-foreground">Sin histórico suficiente para mostrar la tendencia.</div>}
    <div className="flex min-h-5 items-center justify-between gap-3 font-mono text-[10px] text-muted-foreground" aria-live="polite">
      <span>{activePoint ? dateFormat.format(new Date(`${activePoint.date}T00:00:00Z`)) : firstDate ? dateFormat.format(new Date(`${firstDate}T00:00:00Z`)) : `${days} días`}</span>
      {activePoint ? <span className="flex flex-wrap justify-end gap-x-3"><span className="text-rose-500">Total {formatPrice(activePoint.totalValue)}</span><span className="text-emerald-500">En propiedad {formatPrice(activePoint.ownedValue)}</span></span> : <span>{lastDate ? dateFormat.format(new Date(`${lastDate}T00:00:00Z`)) : ""}</span>}
    </div>
    <p className="mt-1 text-[10px] text-muted-foreground">El valor en propiedad usa las cantidades actuales de tu colección.</p>
  </section>;
}
