import { normalizeCardName } from "@/lib/card-utils";
import { PriceSummary } from "@/lib/pricing";


export type SortField = "inclusion" | "synergy" | "name" | "price_trend" | "price_subtotal" | "cmc" | "type" | "quantity" | "status" | "requested_decks";
export type SortDirection = "asc" | "desc";

function symbolManaValue(symbol: string): number {
  const inner = symbol.trim().toUpperCase();
  if (inner === "X" || inner === "Y" || inner === "Z") return 0;
  if (/^\d+$/.test(inner)) return parseInt(inner, 10);
  if (inner === "½" || inner === "1/2" || (inner.startsWith("H") && inner.length > 1)) return 0.5;
  // Hybrid symbols cost their most expensive half: {2/W} is 2, {W/U} and
  // Phyrexian {W/P} / {G/U/P} are 1.
  if (inner.includes("/")) return Math.max(...inner.split("/").map((part) => (/^\d+$/.test(part) ? parseInt(part, 10) : 1)));
  return 1;
}

/**
 * Mana value from a mana string like "{2}{U}{B}". Mirrors the backend.
 * A combined split cost ("{1}{R} // {1}{U}") adds both halves, as on Scryfall;
 * Adventure and Omen cards (known from the type line) only count the main half.
 */
export function extractCmc(manaCost?: string | null, typeLine?: string | null): number {
  if (!manaCost) return 0;
  let halves = manaCost.split("//");
  if (halves.length > 1 && typeLine && /adventure|aventura|omen|presagio/i.test(typeLine)) {
    halves = halves.slice(0, 1);
  }
  let cmc = 0;
  for (const half of halves) {
    for (const sym of half.match(/\{([^}]+)\}/g) || []) cmc += symbolManaValue(sym.slice(1, -1));
  }
  return cmc;
}

export interface SortableCard {
  inclusionPct?: number;
  synergy?: number;
  cardName: string;
  cardScryfallId: string;
  quantity: number;
  manaCost?: string | null;
  typeLine?: string | null;
  assignedQuantity?: number;
  ownedInCollection?: number;
  missingCount?: number;
  requestedInDecksCount?: number;
}

/**
 * Sorts an array of cards based on the specified sortField, sortDirection, and current price quotes.
 */
export function sortCards<T extends SortableCard>(
  cards: T[],
  field: SortField,
  direction: SortDirection,
  priceSummary?: PriceSummary | null
): T[] {
  const sorted = [...cards];
  const multiplier = direction === "asc" ? 1 : -1;

  return sorted.sort((a, b) => {
    switch (field) {
      case "inclusion":
      case "synergy": {
        const key = field === "inclusion" ? "inclusionPct" : "synergy";
        return multiplier * ((a[key] ?? 0) - (b[key] ?? 0)) || a.cardName.localeCompare(b.cardName);
      }
      case "name": {
        return multiplier * a.cardName.localeCompare(b.cardName);
      }

      case "cmc": {
        const cmcA = extractCmc(a.manaCost, a.typeLine);
        const cmcB = extractCmc(b.manaCost, b.typeLine);
        if (cmcA !== cmcB) return multiplier * (cmcA - cmcB);
        return a.cardName.localeCompare(b.cardName);
      }

      case "type": {
        const typeA = a.typeLine || "";
        const typeB = b.typeLine || "";
        if (typeA !== typeB) return multiplier * typeA.localeCompare(typeB);
        return a.cardName.localeCompare(b.cardName);
      }

      case "quantity": {
        if (a.quantity !== b.quantity) return multiplier * (a.quantity - b.quantity);
        return a.cardName.localeCompare(b.cardName);
      }

      case "price_trend": {
        const quoteA =
          priceSummary?.quotes[a.cardScryfallId] ||
          priceSummary?.quotes[normalizeCardName(a.cardName)];
        const quoteB =
          priceSummary?.quotes[b.cardScryfallId] ||
          priceSummary?.quotes[normalizeCardName(b.cardName)];

        const priceA = quoteA?.unitPrice.trend ?? 0;
        const priceB = quoteB?.unitPrice.trend ?? 0;

        if (priceA !== priceB) return multiplier * (priceA - priceB);
        return a.cardName.localeCompare(b.cardName);
      }

      case "price_subtotal": {
        const quoteA =
          priceSummary?.quotes[a.cardScryfallId] ||
          priceSummary?.quotes[normalizeCardName(a.cardName)];
        const quoteB =
          priceSummary?.quotes[b.cardScryfallId] ||
          priceSummary?.quotes[normalizeCardName(b.cardName)];

        const subA = quoteA?.subtotal ?? (quoteA?.unitPrice.trend ?? 0) * a.quantity;
        const subB = quoteB?.subtotal ?? (quoteB?.unitPrice.trend ?? 0) * b.quantity;

        if (subA !== subB) return multiplier * (subA - subB);
        return a.cardName.localeCompare(b.cardName);
      }

      case "status": {
        // Missing cards first if asc, or assigned first
        const missingA = a.missingCount ?? 0;
        const missingB = b.missingCount ?? 0;
        if (missingA !== missingB) return multiplier * (missingB - missingA);

        const assignedA = a.assignedQuantity ?? 0;
        const assignedB = b.assignedQuantity ?? 0;
        if (assignedA !== assignedB) return multiplier * (assignedB - assignedA);

        return a.cardName.localeCompare(b.cardName);
      }

      case "requested_decks": {
        const reqA = a.requestedInDecksCount ?? 0;
        const reqB = b.requestedInDecksCount ?? 0;
        if (reqA !== reqB) return multiplier * (reqA - reqB);
        return a.cardName.localeCompare(b.cardName);
      }

      default:
        return 0;
    }
  });
}

/**
 * Checks if a card passes the min/max price filter.
 * Returns true if it passes, false if excluded.
 */
export function matchesPriceFilter(
  cardName: string,
  cardScryfallId: string | undefined,
  minPrice: number | null,
  maxPrice: number | null,
  priceQuotes?: Record<string, any> | null
): boolean {
  if (minPrice == null && maxPrice == null) return true;

  const quote =
    (cardScryfallId ? priceQuotes?.[cardScryfallId] : undefined) ||
    priceQuotes?.[normalizeCardName(cardName)];

  const price = quote?.unitPrice?.trend ?? quote?.subtotal;
  if (price == null || isNaN(price)) return false;

  if (minPrice != null && price < minPrice) return false;
  if (maxPrice != null && price > maxPrice) return false;

  return true;
}

