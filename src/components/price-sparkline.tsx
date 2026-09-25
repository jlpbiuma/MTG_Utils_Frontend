"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/deck-colors";

interface PriceSparklineProps {
  points?: { date: string; price: number }[];
  cardName: string;
  windowDays?: number;
  currencySymbol: string;
  onOpen: () => void;
}

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

export function PriceSparkline({ points = [], cardName, currencySymbol, onOpen, windowDays = 30 }: PriceSparklineProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const series = points.filter((point) => point.price > 0 && Number.isFinite(point.price) && Number.isFinite(Date.parse(point.date)))
    .toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const first = series[0];
  const last = series[series.length - 1];
  const available = series.length >= 2 && first.date !== last.date;
  const change = available ? (last.price / first.price - 1) * 100 : 0;
  const color = !available || change === 0 ? "text-muted-foreground" : change > 0 ? "text-emerald-500" : "text-rose-500";
  const low = Math.min(...series.map((point) => point.price));
  const high = Math.max(...series.map((point) => point.price));
  const coords = available ? series.map((point) => ({
    x: 4 + (Date.parse(point.date) - Date.parse(first.date)) / (Date.parse(last.date) - Date.parse(first.date)) * 172,
    y: high === low ? 28 : 48 - (point.price - low) / (high - low) * 40,
  })) : [];
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const active = activeIndex === null ? null : series[Math.min(activeIndex, series.length - 1)];
  const activeCoord = activeIndex === null ? null : coords[Math.min(activeIndex, coords.length - 1)];
  const trend = change > 0 ? "Sube" : change < 0 ? "Baja" : "Sin cambio";

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerLeave={() => setActiveIndex(null)}
      onFocus={() => available && setActiveIndex(series.length - 1)}
      onBlur={() => setActiveIndex(null)}
      onKeyDown={(event) => {
        if (available && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          event.preventDefault();
          setActiveIndex((index) => Math.max(0, Math.min(series.length - 1, (index ?? series.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
        }
      }}
      aria-label={`Histórico de precio de ${cardName}. ${available ? `${trend} ${Math.abs(change).toFixed(2)}% en el período disponible. Usa las flechas para consultar precios y pulsa para ver detalles.` : `Sin historial suficiente en los últimos ${windowDays} días. Pulsa para ver detalles.`}`}
      className={`w-full min-w-0 rounded-lg px-2 py-1 text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${color}`}
    >
      <div className="flex justify-between items-center text-[11px] font-mono">
        <span className="text-muted-foreground">{windowDays}D</span>
        <span>{available ? `${change > 0 ? "↗ +" : change < 0 ? "↘ " : "→ "}${change.toFixed(2)}%` : "—"}</span>
      </div>
      {available ? (
        <svg preserveAspectRatio="none" viewBox="0 0 180 56" className="h-14 w-full overflow-visible" aria-hidden="true"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width * 180;
            let nearest = 0;
            coords.forEach((point, index) => { if (Math.abs(point.x - x) < Math.abs(coords[nearest].x - x)) nearest = index; });
            setActiveIndex(nearest);
          }}
        >
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient></defs>
          <path d={`${path} L176,56 L4,56 Z`} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke="currentColor" vectorEffect="non-scaling-stroke" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {activeCoord && <>
            <line x1={activeCoord.x} x2={activeCoord.x} y1="4" y2="52" stroke="currentColor" vectorEffect="non-scaling-stroke" strokeOpacity="0.4" strokeDasharray="3 3" />
          </>}
        </svg>
      ) : <div className="h-14 flex items-center text-xs text-muted-foreground">Sin historial suficiente</div>}
      <div className="h-4 text-[10px] text-muted-foreground font-mono" aria-live="polite">
        {active ? `${dateFormat.format(new Date(active.date))} · ${formatPrice(active.price, currencySymbol)}` : available ? `${dateFormat.format(new Date(first.date))} – ${dateFormat.format(new Date(last.date))}` : `Últimos ${windowDays} días`}
      </div>
    </button>
  );
}
