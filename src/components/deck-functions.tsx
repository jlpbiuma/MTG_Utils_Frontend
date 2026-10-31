"use client";
import { useEffect, useMemo, useState } from "react";
import { saveFunctionTargets } from "@/actions/purchases";
import { Button } from "@/components/ui/button";
import {
  FUNCTION_LABELS,
  classifyFunctions,
  defaultFunctionTargets,
  type DeckFunction,
} from "@/lib/deck-functions";
import type { DeckCardWithOwnership } from "@/lib/schemas";
import { getFunctionTargets } from "@/lib/reads";
export function DeckFunctions({
  cards,
  deckId,
}: {
  cards: DeckCardWithOwnership[];
  deckId?: string;
}) {
  const defaults = useMemo(() => defaultFunctionTargets(cards), [cards]);
  const [overrides, setOverrides] = useState<
    Partial<Record<DeckFunction, number>>
  >({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (deckId)
      getFunctionTargets(deckId)
        .then((r) => {
          if (active) setOverrides(r.targets);
        })
        .catch(() => {
          if (active)
            setMessage("No se pudieron cargar los objetivos guardados.");
        });
    return () => {
      active = false;
    };
  }, [deckId]);
  const main = cards.filter((c) => !c.isSideboard && !c.isCommander);
  return (
    <section
      aria-label="Funciones del mazo"
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <h2 className="text-lg font-semibold">Funciones</h2>
      <p className="text-xs text-muted-foreground">
        Estimación por texto de reglas y etiquetas del editor; una carta puede
        cubrir varias funciones. Revisa las clasificaciones y ajusta los
        objetivos según tu estrategia.{" "}
        {main.filter((c) => !c.oracleText && !c.tags?.length).length} cartas sin
        texto ni etiquetas disponibles.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.entries(FUNCTION_LABELS) as [DeckFunction, string][]).map(
          ([key, label]) => {
            const matches = main.filter((c) =>
              classifyFunctions(c).includes(key),
            );
            const count = matches.reduce((n, c) => n + c.quantity, 0);
            const target = overrides[key] ?? defaults.targets[key];
            return (
              <div key={key} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{label}</h3>
                  <span
                    className={
                      count >= target ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {count} / {target}
                  </span>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  Objetivo de {label.toLowerCase()}
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={target}
                    onChange={(e) =>
                      setOverrides({
                        ...overrides,
                        [key]: Math.max(
                          0,
                          Math.min(100, Number(e.target.value)),
                        ),
                      })
                    }
                    className="min-h-11 w-16 rounded border border-input bg-background px-2"
                  />
                </label>
                {defaults.explanations[key] && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {defaults.explanations[key]}
                  </p>
                )}
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer">Ver cartas</summary>
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {matches.map((c) => (
                      <li key={c.id}>
                        {c.quantity} × {c.cardName}
                      </li>
                    ))}
                    {matches.length === 0 && (
                      <li>
                        Sin cartas identificadas. Añade una etiqueta en el
                        editor.
                      </li>
                    )}
                  </ul>
                </details>
              </div>
            );
          },
        )}
      </div>
      {deckId && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await saveFunctionTargets(deckId, overrides);
              setMessage("Objetivos guardados.");
            } catch {
              setMessage("No se pudieron guardar los objetivos.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Guardando…" : "Guardar objetivos"}
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
