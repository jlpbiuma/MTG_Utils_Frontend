"use client";
import type { AcquisitionQuote } from "@/lib/acquisitions";
import { euro } from "@/lib/acquisitions";

export function AcquisitionReview({
  quote,
  acknowledge,
  onAcknowledge,
}: {
  quote: AcquisitionQuote;
  acknowledge: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  return (
    <section
      aria-label="Resumen de compra"
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 text-sm"
    >
      <p>
        Cartas: {euro(quote.subtotal)} · Envío: {euro(quote.shipping)} ·
        Comisión: {euro(quote.fee)}
      </p>
      <p className="text-lg font-semibold">Total: {euro(quote.total)}</p>
      <p className="text-muted-foreground">
        {quote.costBasis === "trend"
          ? "Gasto estimado según la tendencia mostrada."
          : quote.costBasis === "allocated"
            ? "Precio pagado por el lote; coste repartido según su tendencia histórica."
            : "Precio pagado por las cartas, con envío y comisión."}
      </p>
      <p>
        Presupuesto anual resultante: {euro(quote.budget.spent)} / 600 € ·
        Restante: {euro(quote.budget.remaining)}
      </p>
      {quote.budget.requiresAcknowledgement && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3"
        >
          <p>
            {quote.budget.excess > 0
              ? `Se supera el límite anual en ${euro(quote.budget.excess)}.`
              : "Esta compra supera la referencia mensual de 50 €. Puedes utilizar presupuesto de otros meses del mismo año."}
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={acknowledge}
              onChange={(event) => onAcknowledge(event.target.checked)}
            />
            He revisado el presupuesto y quiero registrar la compra.
          </label>
        </div>
      )}
      {quote.items.some((item) => item.referenceUnitPrice == null) && (
        <p role="status" className="text-muted-foreground">
          Faltan referencias de mercado para algunas cartas. La comparación se
          mostrará como parcial.
        </p>
      )}
    </section>
  );
}
