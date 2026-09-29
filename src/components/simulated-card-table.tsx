"use client";

import type { SimulationListCard } from "@/lib/simulated-card-list";
import { CardImage } from "@/components/card-image";
import { Badge } from "@/components/ui/badge";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const simulationMoney = (value: number | null, symbol: string) => value === null ? "Sin datos" : `${value.toFixed(2)} ${symbol}`;
export const simulationDifference = (value: number | null, symbol: string) => `${value !== null && value > 0 ? "+" : ""}${simulationMoney(value, symbol)}`;

export function SimulationMembershipTags({ card }: { card: SimulationListCard }) {
  return <>
    {card.selectedPrintingId && <Badge variant="outline">Versión elegida: {card.setCode?.toUpperCase()} #{card.collectorNumber}</Badge>}
    {card.inWants && <Badge variant="outline">Wants</Badge>}
    {card.inDecks && <Badge variant="outline">En mazos</Badge>}
    {!card.inWants && !card.inDecks && !card.copiesOwnedReal && <Badge variant="outline">Fuera de todo</Badge>}
  </>;
}

export function SimulationPriceDetails({ card, symbol }: { card: SimulationListCard; symbol: string }) {
  return <dl className="space-y-1 border-t border-border pt-2 text-xs tabular-nums">
    {[
      ["Mercado / ud.", simulationMoney(card.marketUnitPrice, symbol)],
      ["Mercado total", simulationMoney(card.marketPrice, symbol)],
      ["Compra / ud.", simulationMoney(card.purchaseUnitPrice, symbol)],
      ["Compra total", simulationMoney(card.purchasePrice, symbol)],
      ["Diferencial total", simulationDifference(card.priceDifference, symbol)],
    ].map(([label, value]) => <div key={label} className="flex justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono font-semibold">{value}</dd></div>)}
    {card.purchaseRows.some(row => row.referenceKind === "approximate") && <div className="text-muted-foreground"><dt className="sr-only">Referencia</dt><dd>Referencia de mercado aproximada</dd></div>}
  </dl>;
}

export function SimulatedCardTable({ cards, symbol, onDetails, onDecks, onRemove, removingCardName, selectedNames, onToggleSelect }: {
  cards: SimulationListCard[];
  symbol: string;
  onDetails: (card: SimulationListCard) => void;
  onDecks: (card: SimulationListCard) => void;
  onRemove?: (card: SimulationListCard) => void;
  removingCardName?: string | null;
  selectedNames?: string[];
  onToggleSelect?: (card: SimulationListCard, checked: boolean) => void;
}) {
  return <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
    <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
      <caption className="sr-only">Cartas de la colección simulada</caption>
      <thead className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
        <tr>{["Carta e información", "Tags", "Cantidad", "Precio unitario (mercado)", "Mercado total", "Compra / ud.", "Precio compra (total)", "Precio diferencial (total)", "Utilidad", ...(onRemove ? ["Acciones"] : [])].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-border">
        {cards.map(card => <tr key={card.cardName} className="align-top transition-colors hover:bg-secondary/30">
          <th scope="row" className="min-w-72 px-4 py-3 font-normal">
            <div className="flex items-start gap-3">
              {onToggleSelect && <input type="checkbox" checked={selectedNames?.includes(card.cardName) ?? false} onChange={(event) => onToggleSelect(card, event.target.checked)} aria-label={`Seleccionar ${card.cardName}`} className="mt-2 h-4 w-4" />}
              <button type="button" onClick={() => onDetails(card)} aria-label={`Ver detalles de ${card.cardName}`} className="min-h-11 min-w-11 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {card.imageUri ? <CardImage src={card.imageUri} alt="" width={40} height={56} sizes="40px" className="h-14 w-10 rounded object-cover" /> : <span className="text-xs text-muted-foreground">MTG</span>}
              </button>
              <div className="space-y-1">
                <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri}>
                  <button type="button" onClick={() => onDetails(card)} className="text-left font-semibold hover:text-primary focus-visible:outline-ring">{card.cardName}</button>
                </CardPreviewHover>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{card.typeLine || "Tipo sin datos"}</span><ManaCost manaCost={card.manaCost} /></div>
                {card.purchaseRows.length ? card.purchaseRows.map((row, index) => <p key={index} className="text-xs text-muted-foreground">
                  {row.quantity}× {row.setName?.replaceAll("-", " ") || "Edición sin identificar"} {row.collectorNumber && `#${row.collectorNumber}`} {row.condition} {row.isFoil && "Foil"} · {simulationMoney(row.purchaseUnitPrice, symbol)}/ud.
                  {row.referenceKind === "approximate" && " · Mercado aproximado"}
                  {row.referenceKind === "unavailable" && " · Sin precio de mercado"}
                </p>) : <p className="text-xs text-muted-foreground">{card.setCode?.toUpperCase()} {card.collectorNumber && `#${card.collectorNumber}`}</p>}
              </div>
            </div>
          </th>
          <td className="min-w-40 px-3 py-3"><div className="flex flex-wrap gap-1">
            <SimulationMembershipTags card={card} />
            <Badge variant="outline">{card.copiesOwnedReal ? `En col: x${card.copiesOwnedReal}` : "Nueva"}</Badge>
            {card.sellableCopies > 0 && <Badge variant="outline">Vendible: x{card.sellableCopies}</Badge>}
            {card.netCompletionGain > 0 && <Badge variant="outline">+{card.netCompletionGain.toFixed(2)}% neto</Badge>}
          </div></td>
          <td className="px-3 py-3 text-center tabular-nums">{card.quantity}</td>
          {[card.marketUnitPrice, card.marketPrice, card.purchaseUnitPrice, card.purchasePrice].map((value, index) => <td key={index} className="whitespace-nowrap px-3 py-3 text-right font-mono">{simulationMoney(value, symbol)}</td>)}
          <td className="whitespace-nowrap px-3 py-3 text-right font-mono">{simulationDifference(card.priceDifference, symbol)}</td>
          <td className="min-w-40 px-3 py-3 text-xs">
            <p>Útiles: {card.usefulCopies} · Sobrantes: {card.surplusCopies}</p>
            <p>Necesarias en mazos: {card.copiesNeededTotal}</p>
            <p>Valor vendible: {simulationMoney(card.sellableValue, symbol)}</p>
            {card.candidateDecks.length > 0 && <button type="button" onClick={() => onDecks(card)} className="min-h-11 text-left text-primary underline focus-visible:outline-ring">Ver mazos que la necesitan ({card.candidateDeckCount})</button>}
          </td>
          {onRemove && <td className="px-3 py-3 text-right">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Eliminar ${card.cardName} de la colección simulada`}
              title={`Eliminar ${card.cardName}`}
              disabled={removingCardName === card.cardName}
              onClick={() => onRemove(card)}
              className="text-muted-foreground hover:text-destructive"
            ><Trash2 className="h-4 w-4" /></Button>
          </td>}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
