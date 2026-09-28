"use client";

import { useId, useState } from "react";
import type { PurchaseAnalysis } from "@/actions/simulated-collections";

const GROUP_NAMES: Record<string, string> = {
  wants: "Cubren wants",
  decks: "Mazos (fuera de wants cubiertos)",
  owned: "Colección (fuera de los anteriores)",
  extra_wants: "Copias extra de wants",
  unrelated: "Fuera de wants, mazos y colección",
};
const REFERENCE_NAMES = { exact: "Edición identificada", approximate: "Referencia aproximada", unavailable: "Sin precio de mercado" };
const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const euros = (value: number | null) => value === null ? "Sin datos" : currency.format(value);
const difference = (value: number | null) => value === null ? "Sin datos" : `${value > 0 ? "+" : ""}${euros(value)}`;

export function SimulatedPurchaseComparison({ analysis: a, onCardDetails }: { analysis: PurchaseAnalysis; onCardDetails?: (name: string) => void }) {
  const id = useId();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("original");
  const rows = a.cards.filter(c => filter === "all"
    || (filter === "wants" && c.wantsCoveredCopies > 0)
    || (filter === "in-wants" && c.inWants)
    || (filter === "decks" && c.inDecks)
    || (filter === "owned" && c.copiesOwned > 0)
    || (filter === "rest" && c.quantity > c.wantsCoveredCopies)
    || (filter === "unrelated" && !c.inWants && !c.inDecks && c.copiesOwned === 0)).sort((first, second) => {
      if (sort === "original") return 0;
      const field = sort.startsWith("unit") ? "marketUnitPrice" : sort.startsWith("purchase") ? "purchaseTotal" : "savings";
      const a = first[field], b = second[field];
      if (a === null) return b === null ? 0 : 1;
      if (b === null) return -1;
      return sort.endsWith("asc") ? a - b : b - a;
    });
  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h3 id={`${id}-heading`} className="text-lg font-semibold">Compra vs mercado</h3>
        <p className="text-xs text-muted-foreground">Precios unitarios del carrito × cantidad. Importes en EUR, sin envío ni comisiones.</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [a.missingPurchasePriceCopies ? "Coste leído (parcial)" : "Coste del carrito", euros(a.totalPurchaseCost)],
          ["Mercado comparable", euros(a.comparedMarketValue)],
          ["Diferencia a favor", difference(a.savings)],
          ["Wants cubiertos", `${a.wantsCompletionPercentage.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-secondary/40 p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">
        {a.savings === null ? "No hay precios suficientes para comparar."
          : a.savings > 0 ? "La compra está por debajo de la referencia de mercado."
            : a.savings < 0 ? "La compra está por encima de la referencia de mercado."
              : "La compra coincide con la referencia de mercado."}
        {a.savingsPercentage !== null && ` Diferencia: ${a.savingsPercentage.toFixed(1)}% respecto al mercado.`}
      </p>
      <p className="text-xs text-muted-foreground">
        Comparación de {a.comparedCopies} copias: compra {euros(a.comparedPurchaseCost)} frente a mercado {euros(a.comparedMarketValue)}.
        {" "}Signo positivo = ahorro; negativo = sobreprecio. No es un beneficio de reventa garantizado.
      </p>
      <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
        <p>{a.wantsCoveredCopies} de {a.wantsRequestedCopies} copias de wants cubiertas; {a.wantsCompletedCards} de {a.wantsRequestedCards} nombres completados.</p>
        <p>Gasto en wants: {euros(a.wantsPurchaseCost)} · Resto de la compra: {euros(a.restPurchaseCost)}</p>
        <p>Valor de wants cubiertos menos todo el carrito: <strong>{difference(a.wantsValueMinusTotalCost)}</strong></p>
        <p className="text-xs text-muted-foreground">Wants se cruza por nombre, con independencia de la edición, hasta la cantidad solicitada. El resto se clasifica por este orden: mazos activos, colección, copias extra de wants y cartas ajenas a todas las listas.</p>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{a.approximatePriceCopies} copias con referencia aproximada · {a.missingMarketPriceCopies} sin precio de mercado · {a.missingPurchasePriceCopies} sin precio de compra.</p>
        <p>Se usa la tendencia Cardmarket local (o EUR disponible) de la edición identificada. Si falta la edición, se usa la impresión más barata con precio positivo y se marca como aproximada. No se ajusta por estado o idioma; se asume no foil salvo indicación explícita. Las métricas anteriores del lote mantienen su referencia más barata.</p>
        {a.warnings.length > 0 && <ul aria-label="Avisos de importación" className="list-disc pl-5">{a.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Desglose del coste por destino de las cartas</caption>
          <thead><tr className="border-b border-border"><th scope="col" className="p-2">Destino</th><th scope="col" className="p-2">Copias</th><th scope="col" className="p-2">Compra</th><th scope="col" className="p-2">Mercado comparable</th><th scope="col" className="p-2">Diferencia</th></tr></thead>
          <tbody>{a.groups.map(g => <tr key={g.key} className="border-b border-border/50">
            <th scope="row" className="p-2 font-medium">{GROUP_NAMES[g.key] || g.key}</th>
            <td className="p-2 tabular-nums">{g.quantity}</td><td className="whitespace-nowrap p-2 tabular-nums">{euros(g.purchaseCost)}{g.missingPurchasePriceCopies > 0 && " (parcial)"}</td>
            <td className="whitespace-nowrap p-2 tabular-nums">{g.comparedCopies ? euros(g.comparedMarketValue) : "Sin datos"}</td><td className="whitespace-nowrap p-2 tabular-nums">{difference(g.savings)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <details>
        <summary className="cursor-pointer py-3 text-sm font-medium focus-visible:outline-ring">Ver precios por carta ({a.cards.length} filas)</summary>
        <label htmlFor={`${id}-filter`} className="text-sm">Mostrar cartas</label>
        <select id={`${id}-filter`} value={filter} onChange={e => setFilter(e.target.value)} className="ml-2 min-h-11 max-w-full rounded-md border border-border bg-background p-2 text-sm">
          <option value="all">Todas</option><option value="in-wants">En wants</option><option value="decks">En mazos</option><option value="owned">En colección</option><option value="wants">Cubren wants</option><option value="rest">Con copias fuera de wants cubiertos</option><option value="unrelated">Fuera de wants, mazos y colección</option>
        </select>
        <label htmlFor={`${id}-sort`} className="ml-3 text-sm">Ordenar precios por carta</label>
        <select id={`${id}-sort`} value={sort} onChange={event => setSort(event.target.value)} className="ml-2 min-h-11 max-w-full rounded-md border border-border bg-background p-2 text-sm">
          <option value="original">Orden del carrito</option>
          <option value="unit-desc">Precio unitario: mayor primero</option><option value="unit-asc">Precio unitario: menor primero</option>
          <option value="purchase-desc">Precio compra total: mayor primero</option><option value="purchase-asc">Precio compra total: menor primero</option>
          <option value="difference-desc">Precio diferencial: mayor primero</option><option value="difference-asc">Precio diferencial: menor primero</option>
        </select>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Precios de compra y mercado por carta</caption>
            <thead><tr className="border-b border-border"><th scope="col" className="p-2">Carta</th><th scope="col" className="p-2">Copias</th><th scope="col" className="p-2">Compra / ud.</th><th scope="col" className="p-2">Mercado / ud.</th><th scope="col" className="p-2">Diferencia total</th></tr></thead>
            <tbody>{rows.map((c, i) => <tr key={i} className="border-b border-border/50">
              <th scope="row" className="min-w-48 p-2 font-normal">
                {onCardDetails ? <button type="button" onClick={() => onCardDetails(c.cardName)} className="min-h-11 text-left font-medium hover:text-primary focus-visible:outline-ring">{c.cardName}</button> : <span className="font-medium">{c.cardName}</span>}
                <span className="block text-xs text-muted-foreground">{c.setName?.replaceAll("-", " ")} {c.collectorNumber && `#${c.collectorNumber}`} {c.condition} {c.isFoil && "Foil"}</span>
                <span className="block text-xs text-muted-foreground">{REFERENCE_NAMES[c.referenceKind]}{c.referenceSet && `: ${c.referenceSet} #${c.referenceCollectorNumber}`}</span>
                <span className="block text-xs text-muted-foreground">Wants: {c.wantsCoveredCopies} · Mazos: {c.inDecks ? "Sí" : "No"} · En colección: {c.copiesOwned}</span>
              </th>
              <td className="p-2 tabular-nums">{c.quantity}</td><td className="whitespace-nowrap p-2 tabular-nums">{euros(c.purchaseUnitPrice)}</td><td className="whitespace-nowrap p-2 tabular-nums">{euros(c.marketUnitPrice)}</td><td className="whitespace-nowrap p-2 tabular-nums">{difference(c.savings)}</td>
            </tr>)}</tbody>
          </table>
          {rows.length === 0 && <p className="py-3 text-sm text-muted-foreground">No hay cartas en este grupo.</p>}
        </div>
      </details>
    </section>
  );
}
