import type { PurchaseCard, SimulatedCardAnalysisItem, SimulatedCollectionAnalysisResponse } from "@/actions/simulated-collections";
import { isBasicLand, normalizeCardName } from "@/lib/card-utils";

export type SimulationFilter = "all" | "wants" | "decks" | "unrelated" | "useful" | "sellable" | "new" | "owned";
export type SimulationSort = "name-asc" | "name-desc" | "price-desc" | "price-asc" | "unit-desc" | "unit-asc" | "purchase-desc" | "purchase-asc" | "difference-desc" | "difference-asc" | "gain-desc" | "quantity-desc";
export interface SimulationListCard extends SimulatedCardAnalysisItem {
  inWants: boolean;
  inDecks: boolean;
  marketUnitPrice: number | null;
  marketPrice: number | null;
  purchaseUnitPrice: number | null;
  purchasePrice: number | null;
  priceDifference: number | null;
  purchaseRows: PurchaseCard[];
}

const completeSum = (rows: PurchaseCard[], field: "purchaseTotal" | "marketTotal" | "savings") =>
  rows.length && rows.every(row => row[field] !== null)
    ? Math.round(rows.reduce((sum, row) => sum + row[field]!, 0) * 100) / 100 : null;

export function simulationListCards(analysis: SimulatedCollectionAnalysisResponse): SimulationListCard[] {
  const purchases = new Map<string, PurchaseCard[]>();
  for (const row of analysis.purchaseAnalysis?.cards ?? []) {
    const name = normalizeCardName(row.cardName);
    const entries = purchases.get(name) ?? [];
    entries.push(row);
    purchases.set(name, entries);
  }
  return analysis.cards.map(card => {
    const rows = purchases.get(normalizeCardName(card.cardName)) ?? [];
    const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
    const purchasePrice = completeSum(rows, "purchaseTotal");
    const marketPrice = rows.length ? completeSum(rows, "marketTotal") : card.unitPrice > 0 ? card.totalPrice : null;
    return {
      ...card,
      inWants: card.inWants ?? rows.some(row => row.inWants),
      inDecks: card.copiesNeededTotal > 0 || rows.some(row => row.inDecks),
      marketPrice,
      marketUnitPrice: rows.length ? marketPrice === null ? null : marketPrice / quantity : card.unitPrice > 0 ? card.unitPrice : null,
      purchasePrice,
      purchaseUnitPrice: purchasePrice === null ? null : purchasePrice / quantity,
      priceDifference: completeSum(rows, "savings"),
      purchaseRows: rows,
    };
  });
}

export function matchesSimulationFilter(card: SimulationListCard, filter: SimulationFilter) {
  switch (filter) {
    case "wants": return card.inWants;
    case "decks": return card.inDecks;
    case "owned": return card.copiesOwnedReal > 0;
    case "unrelated": return !card.inWants && !card.inDecks && card.copiesOwnedReal === 0;
    case "useful": return card.usefulCopies > 0 && card.copiesOwnedReal === 0 && !isBasicLand(card.typeLine, card.cardName);
    case "sellable": return card.sellableCopies > 0;
    case "new": return card.copiesOwnedReal === 0;
    default: return true;
  }
}

export function sortSimulationCards(cards: SimulationListCard[], sort: SimulationSort) {
  const number = (card: SimulationListCard): number | null => {
    switch (sort) {
      case "unit-asc": case "unit-desc": return card.marketUnitPrice;
      case "purchase-asc": case "purchase-desc": return card.purchasePrice;
      case "difference-asc": case "difference-desc": return card.priceDifference;
      case "gain-desc": return card.netCompletionGain;
      case "quantity-desc": return card.quantity;
      default: return card.marketPrice;
    }
  };
  return [...cards].sort((a, b) => {
    const names = a.cardName.localeCompare(b.cardName);
    if (sort === "name-asc") return names;
    if (sort === "name-desc") return -names;
    const first = number(a), second = number(b);
    if (first === null) return second === null ? names : 1;
    if (second === null) return -1;
    return (sort.endsWith("asc") ? first - second : second - first) || names;
  });
}
