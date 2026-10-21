"use client";

import type { ReactNode } from "react";
import type { WhatsAppDealMatch } from "@/actions/whatsapp-matches";
import { Button } from "@/components/ui/button";
import { ExportListDialog } from "@/components/export-list-dialog";
import {
  type OpportunitySelection, opportunityKey, selectedQuantity, tradeQuantity,
  opportunityPrice, priceCurrency, formatOpportunityValue, selectionValue, selectionList, selectionCompletion,
} from "@/lib/opportunity-selection";

export function OpportunityValue({ matches, selection, label, metric = "purchase", summary = false }: {
  matches: WhatsAppDealMatch[]; selection: OpportunitySelection; label: string; metric?: "purchase" | "trend"; summary?: boolean;
}) {
  const value = selectionValue(matches, selection, metric);
  return <div className={summary ? "space-y-1 rounded-xl border border-border bg-card p-4" : "space-y-1"} role="status" aria-label={label}>
    <p className={summary ? "text-xs text-muted-foreground" : "text-sm font-medium"}>{label}</p>
    <p className={summary ? "mt-1 break-words text-2xl font-bold font-mono tabular-nums" : "text-lg font-semibold tabular-nums"}>
      {Object.entries(value.totals).map(([currency, amount]) => formatOpportunityValue(amount, currency)).join(" + ") || (value.missingPrices ? "Sin valoración disponible" : formatOpportunityValue(0, "EUR"))}
    </p>
    <p className="text-xs text-muted-foreground">{matches.filter((match) => selectedQuantity(match, selection) > 0).length} cartas seleccionadas{value.missingPrices ? ` · ${value.missingPrices} sin precio (excluidas del valor)` : ""}</p>
  </div>;
}

export function OpportunityLinkGroups({ matches, allMatches, selection, onSelectionChange, view, renderCard, deckCount, completionBefore }: {
  matches: WhatsAppDealMatch[]; allMatches: WhatsAppDealMatch[];
  selection: OpportunitySelection; onSelectionChange: (changes: OpportunitySelection) => void;
  deckCount: number; completionBefore: number;
  view: "grid" | "list"; renderCard: (match: WhatsAppDealMatch, controls: ReactNode) => ReactNode;
}) {
  const fullGroups = new Map<string, WhatsAppDealMatch[]>();
  for (const match of allMatches) {
    const key = JSON.stringify([match.subject, match.whatsapp_url]);
    const group = fullGroups.get(key) ?? [];
    group.push(match);
    fullGroups.set(key, group);
  }
  const groups = new Map<string, WhatsAppDealMatch[]>();
  for (const match of matches) {
    const key = JSON.stringify([match.subject, match.whatsapp_url]);
    const group = groups.get(key) ?? [];
    group.push(match);
    groups.set(key, group);
  }
  return <div className="space-y-6">{Array.from(groups, ([key, visible], index) => {
    const first = visible[0];
    const buying = first.subject === "vende";
    const group = fullGroups.get(key) ?? visible;
    const cards = selectionList(group, selection);
    const title = `${buying ? "Comprar" : "Vender"} · Enlace ${index + 1}`;
    return <section key={key} aria-label={title} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
        <div className="min-w-0 space-y-1">
          <h2 className="font-semibold">{title}</h2>
          {first.whatsapp_url.startsWith("https://") ? <p className="break-all text-sm text-muted-foreground">{first.whatsapp_url}</p> : <p className="text-sm text-muted-foreground">Foto de WhatsApp · {first.source_phone}</p>}
          <p className="text-xs text-muted-foreground">{visible.length} de {group.length} cartas visibles. La lista incluye toda la selección de este enlace.</p>
        </div>
        <OpportunityValue matches={group} selection={selection} label={buying ? "Valor de compra del enlace" : "Valor de venta del enlace"} />
      </div>
      {buying ? <OpportunityCompletion matches={group} selection={selection} deckCount={deckCount} before={completionBefore} label="Completitud global con este enlace" /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={() => onSelectionChange(Object.fromEntries(group.map((match) => [opportunityKey(match), tradeQuantity(match)])))}>Seleccionar todas</Button>
        <Button variant="outline" className="min-h-11" onClick={() => onSelectionChange(Object.fromEntries(group.map((match) => [opportunityKey(match), 0])))}>Deseleccionar todas</Button>
        {cards.length ? <ExportListDialog cards={cards}
          title={buying ? "Lista de compra" : "Lista de venta"}
          triggerText={buying ? "Generar lista de compra" : "Generar lista de venta"}
          description={`Cartas seleccionadas para ${buying ? "comprar" : "vender"} del enlace ${first.whatsapp_url}. Copia o descarga la lista.`}
          fileNamePrefix={`${buying ? "compra" : "venta"}-enlace-${index + 1}`} /> :
          <Button variant="outline" disabled className="min-h-11">{buying ? "Generar lista de compra" : "Generar lista de venta"}</Button>}
      </div>
      <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "overflow-hidden rounded-xl border border-border bg-card divide-y divide-border"}>
        {visible.map((match) => {
          const quantity = selectedQuantity(match, selection);
          const max = tradeQuantity(match);
          const price = opportunityPrice(match);
          const currency = priceCurrency(match);
          const controls = <div className={view === "grid" ? "space-y-2 rounded-lg border border-border bg-muted/20 p-3" : "flex flex-wrap items-center gap-x-5 gap-y-2"}>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input type="checkbox" aria-label={`Seleccionar ${match.card_name}`} checked={quantity > 0} disabled={max === 0}
                  onChange={(event) => onSelectionChange({ [opportunityKey(match)]: event.target.checked ? max : 0 })} className="h-5 w-5 accent-primary" />
                {quantity > 0 ? "Seleccionada" : "Sin seleccionar"}
              </label>
              <div className={view === "grid" ? "text-sm space-y-1" : "min-w-0 flex-1 space-y-1 text-xs [&_strong]:font-mono [&_strong]:text-sm"}>
                <p>Valor de tendencia: <strong>{match.trend_unit_price == null ? "Sin precio" : formatOpportunityValue(match.trend_unit_price, "EUR")}</strong></p>
                <p>Valor {buying ? "de compra" : "de venta"}: <strong>{price === null ? "Sin precio" : formatOpportunityValue(price * max, currency)}</strong></p>
                {price !== null ? <p className="text-xs text-muted-foreground">{match.price_source === "cardmarket" ? "Referencia Cardmarket" : match.price != null ? "Precio del enlace" : "Valor de compra estimado"}</p> : null}
                {buying ? <p>Completitud global si se añade: <strong>{match.global_completion_after == null ? "Sin datos" : `${match.global_completion_after.toFixed(2)}%`}</strong>
                  {match.global_completion_after != null ? <span className="block text-xs text-emerald-500">+{(match.completion_gain ?? 0).toFixed(2)} puntos porcentuales</span> : null}</p> : null}
                {max === 0 ? <p className="text-xs text-muted-foreground">Sin copias disponibles para esta operación.</p> : null}
              </div>
            </div>;
          return <div key={opportunityKey(match)} data-selected={quantity > 0} className={`min-w-0 [&>div]:h-full transition-[opacity,filter] ${quantity > 0 ? "" : "opacity-50 grayscale brightness-75"}`}>{renderCard(match, controls)}</div>;
        })}
      </div>
    </section>;
  })}</div>;
}

export function OpportunityCompletion({ matches, selection, deckCount, before, label, summary = false }: {
  matches: WhatsAppDealMatch[]; selection: OpportunitySelection; deckCount: number; before: number; label: string; summary?: boolean;
}) {
  const progress = selectionCompletion(matches, selection, deckCount, before);
  return <div role="status" aria-label={label} className={summary ? "space-y-1 rounded-xl border border-primary/30 bg-card p-4" : "space-y-1"}>
    <p className={summary ? "text-xs text-muted-foreground" : "text-sm font-medium"}>{label}</p>
    {deckCount ? <>
      <p className={summary ? "mt-1 break-words text-2xl font-bold font-mono tabular-nums" : "text-lg font-semibold tabular-nums"}>{progress.before.toFixed(2)}% → {progress.after.toFixed(2)}%</p>
      <p className="text-xs text-muted-foreground">+{progress.gain.toFixed(2)} puntos porcentuales · Media de {deckCount} mazos activos</p>
    </> : <p className="text-sm text-muted-foreground">Sin mazos activos</p>}
  </div>;
}
