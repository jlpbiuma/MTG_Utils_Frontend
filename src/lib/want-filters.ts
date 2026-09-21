import { getCardCategory } from "@/lib/card-utils";
import { extractColorsFromManaCost } from "@/lib/deck-colors";
import { normalizeCardName } from "@/lib/card-utils";

export interface WantPriceQuote {
  unitPrice: { trend: number };
}

export interface WantFilterCard {
  cardName: string;
  cardScryfallId: string;
  setCode?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
}

export interface WantListFilters {
  minPrice: number | null;
  maxPrice: number | null;
  setCode: string;
  colors: string[];
  colorless: boolean;
  typeKey: string;
}

export function filterWantCards<T extends WantFilterCard>(
  cards: T[],
  filters: WantListFilters,
  quotes?: Record<string, WantPriceQuote> | null
): T[] {
  return cards.filter((card) => {
    if (filters.setCode && (card.setCode || "").toUpperCase() !== filters.setCode.toUpperCase()) {
      return false;
    }

    if (filters.typeKey && getCardCategory(card.typeLine, card.cardName) !== filters.typeKey) {
      return false;
    }

    const colors = extractColorsFromManaCost(card.manaCost);
    if (filters.colorless && colors.length > 0) return false;
    if (
      !filters.colorless &&
      filters.colors.length > 0 &&
      !filters.colors.every((color) => colors.includes(color as "W" | "U" | "B" | "R" | "G"))
    ) {
      return false;
    }

    if (filters.minPrice != null || filters.maxPrice != null) {
      const quote =
        quotes?.[card.cardScryfallId] || quotes?.[normalizeCardName(card.cardName)];
      const price = quote?.unitPrice.trend;
      if (price == null) return false;
      if (filters.minPrice != null && price < filters.minPrice) return false;
      if (filters.maxPrice != null && price > filters.maxPrice) return false;
    }

    return true;
  });
}
