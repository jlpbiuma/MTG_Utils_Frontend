import type { PriceHistoryStatistics } from "@/lib/pricing/types";

export function historicalPrice(value?: number | null) {
  return value == null
    ? "Sin datos"
    : new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(value);
}
export function HistoricalPriceSummary({
  statistics,
  label,
}: {
  statistics?: PriceHistoryStatistics | null;
  label: string;
}) {
  const count = statistics?.observations ?? 0;
  return (
    <section
      aria-label={label}
      className="rounded-lg border border-border bg-background/50 p-3 space-y-2"
    >
      <h4 className="text-sm font-medium">{label}</h4>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Media histórica</dt>
          <dd className="font-semibold tabular-nums">
            {historicalPrice(statistics?.mean)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Desviación típica</dt>
          <dd className="font-semibold tabular-nums">
            {historicalPrice(statistics?.standardDeviation)}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {count > 0
          ? `${count} ${count === 1 ? "fecha observada" : "fechas observadas"} · ${statistics?.firstObservedOn} – ${statistics?.lastObservedOn}`
          : "Sin histórico disponible."}
        {count === 1 && " Una sola fecha no permite valorar la fluctuación."}
      </p>
    </section>
  );
}
