import type { Expansion, ExpansionCard } from "@/actions/expansions";

export type ExpansionFilter = "all" | "owned" | "missing";
export type ExpansionSort = "number" | "name" | "price" | "trend_abs" | "trend_pct";
export type SortDirection = "asc" | "desc";
export type ExpansionGroup = "none" | "rarity" | "type";

const eligibleTypes = new Set(["expansion", "core", "masters", "draft_innovation", "commander"]);

export function filterExpansions(expansions: Expansion[], query: string): Expansion[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return expansions.filter((set) => eligibleTypes.has(set.setType) &&
    (!normalizedQuery || set.name.toLocaleLowerCase().includes(normalizedQuery) || set.code.toLocaleLowerCase().includes(normalizedQuery)));
}

export function getExpansionProgress(cards: ExpansionCard[]) {
  const total = new Set(cards.map((card) => card.id)).size;
  const owned = new Set(cards.filter((card) => card.isOwned).map((card) => card.id)).size;
  return { owned, total, percentage: total ? Math.round((owned / total) * 100) : 0 };
}

export function summarizeAcquisitionBalance(cards: ExpansionCard[]) {
  const seen = new Set<string>();
  let currentValue = 0;
  let acquisitionValue = 0;
  let measuredCards = 0;
  for (const card of cards) {
    if (!card.isOwned || !card.acquiredAt || card.acquisitionTrendAbsoluteChange == null) continue;
    const key = card.collectionCardId || card.catalogId || card.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const price = card.priceCardmarketTrend;
    if (price == null || !Number.isFinite(price)) continue;
    const quantity = Math.max(0, card.ownedQuantity);
    currentValue += price * quantity;
    acquisitionValue += (price - card.acquisitionTrendAbsoluteChange) * quantity;
    measuredCards += 1;
  }
  const absoluteChange = currentValue - acquisitionValue;
  return {
    currentValue,
    acquisitionValue,
    absoluteChange,
    percentageChange: acquisitionValue > 0 ? (absoluteChange / acquisitionValue) * 100 : null,
    measuredCards,
  };
}

export function organizeExpansionCards(
  cards: ExpansionCard[],
  options: { filter: ExpansionFilter; sort: ExpansionSort; direction: SortDirection; group: ExpansionGroup; query: string },
): Array<{ key: string; cards: ExpansionCard[] }> {
  const query = options.query.trim().toLocaleLowerCase();
  const filtered = cards.filter((card) => {
    if (options.filter === "owned" && !card.isOwned) return false;
    if (options.filter === "missing" && card.isOwned) return false;
    return !query || (card.cardName || "").toLocaleLowerCase().includes(query) || card.collectorNumber.toLocaleLowerCase().includes(query);
  });
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  filtered.sort((a, b) => {
    let difference = 0;
    if (options.sort === "name") difference = collator.compare(a.cardName || "", b.cardName || "");
    else if (options.sort === "price") {
      const left = a.priceCardmarketTrend;
      const right = b.priceCardmarketTrend;
      if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
      difference = left - right;
    }
    else if (options.sort === "trend_abs") {
      const left = a.priceTrendAbsoluteChange;
      const right = b.priceTrendAbsoluteChange;
      if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
      difference = left - right;
    } else if (options.sort === "trend_pct") {
      const left = a.priceTrendPercentageChange;
      const right = b.priceTrendPercentageChange;
      if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
      difference = left - right;
    } else difference = collator.compare(a.collectorNumber, b.collectorNumber);
    if (difference !== 0) {
      return options.direction === "desc" ? -difference : difference;
    }
    const numberOrder = collator.compare(a.collectorNumber, b.collectorNumber);
    return options.direction === "desc" ? -numberOrder : numberOrder;
  });
  if (options.group === "none") return [{ key: "Todas las cartas", cards: filtered }];
  const groups = new Map<string, ExpansionCard[]>();
  for (const card of filtered) {
    const key = options.group === "rarity"
      ? (card.rarity || "Sin rareza").replace(/^./, (letter) => letter.toLocaleUpperCase())
      : (card.typeLine?.split("—")[0]?.trim() || "Tipo desconocido");
    const bucket = groups.get(key);
    if (bucket) bucket.push(card);
    else groups.set(key, [card]);
  }
  return [...groups].map(([key, groupCards]) => ({ key, cards: groupCards }));
}
