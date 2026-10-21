"use client";
import { useEffect, useState } from "react";
import { getDeckValueHistory } from "@/actions/purchases";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export function DeckValueMiniChart({ deckId }: { deckId: string }) {
  const [history, setHistory] = useState<Awaited<
    ReturnType<typeof getDeckValueHistory>
  > | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    getDeckValueHistory(deckId)
      .then((h) => {
        if (active) setHistory(h);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [deckId]);
  return (
    <div className="w-full rounded-lg border border-border bg-card p-3 sm:max-w-xs">
      <p className="text-xs text-muted-foreground">
        Valor del mazo · 30 días · Cardmarket
      </p>
      {history && history.points.length > 1 ? (
        <div
          className="h-16"
          role="img"
          aria-label="Evolución del valor de la composición actual del mazo"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.points}>
              <XAxis dataKey="date" hide />
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip />
              <Line
                dataKey="value"
                name="Valor EUR"
                stroke="var(--color-primary)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {error
            ? "Histórico no disponible"
            : history
              ? "Histórico insuficiente"
              : "Cargando histórico…"}
        </p>
      )}
      {history?.note && (
        <p className="mt-1 text-[11px] text-muted-foreground">{history.note}</p>
      )}
    </div>
  );
}
