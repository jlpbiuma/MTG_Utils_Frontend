/**
 * EDHREC API client and recommendations extractor.
 * Fetches community commander recommendations from https://json.edhrec.com
 * with in-memory 24h caching.
 */

import { normalizeCardName } from "./card-utils";

export interface EdhrecRawCardview {
  id: string;
  name: string;
  sanitized: string;
  slug?: string;
  url?: string;
  synergy?: number;
  num_decks?: number;
  potential_decks?: number;
  trend_zscore?: number;
}

export interface EdhrecRawCardlist {
  tag: string;
  header: string;
  cardviews: EdhrecRawCardview[];
}

export interface EdhrecParsedCard {
  id: string;
  name: string;
  normalizedName: string;
  sanitized: string;
  category: string;
  categories: string[];
  numDecks: number;
  potentialDecks: number;
  inclusionPct: number;
  synergy: number;
  imageUri: string | null;
}

export interface EdhrecCommanderResponse {
  commander: {
    name: string;
    id: string;
    imageUri: string | null;
    numDecks: number;
    colorIdentity: string[];
    typeLine: string;
  } | null;
  categories: string[];
  cards: EdhrecParsedCard[];
}

// In-memory cache with 24-hour TTL
interface CacheEntry {
  timestamp: number;
  data: EdhrecCommanderResponse;
}

const edhrecCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Converts a Magic card / commander name into an EDHREC-compatible URL slug.
 * Strips accents, punctuation, handles split/partner card slashes, and downcases.
 */
export function toEdhrecSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/\s*\/\/\s*/g, "-") // handle dual / partner slashes
    .replace(/[^a-z0-9\s-]/g, "") // strip punctuation (commas, quotes, etc.)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Builds the EDHREC image CDN URL given a Scryfall UUID.
 */
export function getEdhrecCardImageUrl(id: string): string | null {
  if (!id || id.length < 2) return null;
  return `https://card-images.edhrec.com/normal/front/${id.charAt(0)}/${id.charAt(1)}/${id}.jpg`;
}

export type EdhrecSortOption =
  | "inclusion"
  | "synergy"
  | "name"
  | "requested_decks"
  | "price_desc"
  | "price_asc";

export interface EdhrecCategoryGroup<T> {
  category: string;
  cards: T[];
}

/**
 * Sorts EDHREC cards according to chosen criteria:
 * - inclusion: community inclusion % descending (default)
 * - synergy: community synergy score descending
 * - requested_decks: number of user decks requesting the card descending
 * - price_desc: market price descending (highest first)
 * - price_asc: market price ascending (lowest first)
 * - name: card name alphabetical (A-Z)
 */
export function sortEdhrecCards<
  T extends {
    name: string;
    inclusionPct: number;
    synergy: number;
    id?: string;
    requestedInDecksCount?: number;
    requestedInDecks?: any[];
  },
>(
  cards: T[],
  sortBy: EdhrecSortOption = "inclusion",
  priceMap?: Record<string, number>
): T[] {
  return [...cards].sort((a, b) => {
    if (sortBy === "synergy") return b.synergy - a.synergy;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "requested_decks") {
      const countA = a.requestedInDecksCount ?? a.requestedInDecks?.length ?? 0;
      const countB = b.requestedInDecksCount ?? b.requestedInDecks?.length ?? 0;
      if (countB !== countA) return countB - countA;
      return b.inclusionPct - a.inclusionPct;
    }
    if (sortBy === "price_desc") {
      const pA = (priceMap && (priceMap[a.id || ""] ?? priceMap[normalizeCardName(a.name)])) ?? 0;
      const pB = (priceMap && (priceMap[b.id || ""] ?? priceMap[normalizeCardName(b.name)])) ?? 0;
      if (pB !== pA) return pB - pA;
      return b.inclusionPct - a.inclusionPct;
    }
    if (sortBy === "price_asc") {
      const pA = (priceMap && (priceMap[a.id || ""] ?? priceMap[normalizeCardName(a.name)])) ?? 0;
      const pB = (priceMap && (priceMap[b.id || ""] ?? priceMap[normalizeCardName(b.name)])) ?? 0;
      if (pA > 0 && pB > 0) {
        if (pA !== pB) return pA - pB;
      } else if (pA > 0 && pB === 0) {
        return -1;
      } else if (pA === 0 && pB > 0) {
        return 1;
      }
      return b.inclusionPct - a.inclusionPct;
    }
    return b.inclusionPct - a.inclusionPct;
  });
}

/**
 * Maps EDHREC category tags / headers to human-friendly Spanish display names.
 */
export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    "high synergy cards": "Sinergia Alta",
    "top cards": "Más Jugadas",
    "new cards": "Nuevas Cartas",
    "game changers": "Game Changers",
    "creatures": "Criaturas",
    "instants": "Instantáneos",
    "sorceries": "Conjuros",
    "utility artifacts": "Artefactos de Utilidad",
    "mana artifacts": "Artefactos de Maná",
    "artifacts": "Artefactos",
    "enchantments": "Encantamientos",
    "planeswalkers": "Planeswalkers",
    "utility lands": "Tierras de Utilidad",
    "lands": "Tierras",
    "battles": "Batallas",
  };
  return map[category.toLowerCase().trim()] || category;
}

/**
 * Groups recommendations into EDHREC sections (Creatures, High Synergy Cards, Top Cards, …).
 * Section order follows `categoryOrder` from the API; within each section
 * cards are sorted by the chosen sort criteria.
 * If a card belongs to multiple categories (e.g. High Synergy + Creatures),
 * it is included in all matching sections so that both High Synergy and
 * type sections remain complete.
 */
export function groupRecommendationsByCategory<
  T extends {
    category: string;
    categories?: string[];
    name: string;
    inclusionPct: number;
    synergy: number;
    id?: string;
    requestedInDecksCount?: number;
    requestedInDecks?: any[];
  },
>(
  cards: T[],
  categoryOrder: string[],
  sortBy: EdhrecSortOption = "inclusion",
  priceMap?: Record<string, number>
): EdhrecCategoryGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const card of cards) {
    // If card has multiple categories, include in all of them
    const cats =
      Array.isArray(card.categories) && card.categories.length > 0
        ? card.categories
        : [card.category || "Other"];

    for (const cat of cats) {
      const list = buckets.get(cat);
      if (list) {
        if (!list.some((existing) => existing.name === card.name)) {
          list.push(card);
        }
      } else {
        buckets.set(cat, [card]);
      }
    }

    // If card has strong synergy (>= 20) and "High Synergy Cards" exists in categoryOrder,
    // ensure it is placed in "High Synergy Cards" even if not explicitly tagged
    if (
      card.synergy >= 20 &&
      categoryOrder.includes("High Synergy Cards") &&
      !cats.some((c) => /synergy/i.test(c))
    ) {
      const hsList = buckets.get("High Synergy Cards");
      if (hsList) {
        if (!hsList.some((existing) => existing.name === card.name)) {
          hsList.push(card);
        }
      } else {
        buckets.set("High Synergy Cards", [card]);
      }
    }
  }

  const sortCards = (list: T[]) => sortEdhrecCards(list, sortBy, priceMap);

  const groups: EdhrecCategoryGroup<T>[] = [];
  const seen = new Set<string>();

  for (const cat of categoryOrder) {
    const list = buckets.get(cat);
    if (!list || list.length === 0) continue;
    groups.push({ category: cat, cards: sortCards(list) });
    seen.add(cat);
  }

  for (const [cat, list] of buckets) {
    if (seen.has(cat) || list.length === 0) continue;
    groups.push({ category: cat, cards: sortCards(list) });
  }

  return groups;
}

/**
 * Fetches and parses EDHREC commander page data.
 */
export async function fetchEdhrecCommanderData(
  commanderName: string
): Promise<EdhrecCommanderResponse | null> {
  const slug = toEdhrecSlug(commanderName);
  if (!slug) return null;

  // Check cache
  const cached = edhrecCache.get(slug);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://json.edhrec.com/pages/commanders/${slug}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MTGUtils/1.0",
      },
      next: { revalidate: 86400 }, // Next.js fetch cache 24h
    });

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`[EDHREC] Commander not found for slug '${slug}' (${commanderName})`);
        return null;
      }
      throw new Error(`EDHREC HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const jsonDict = data?.container?.json_dict;
    if (!jsonDict) {
      console.warn(`[EDHREC] Missing json_dict in payload for '${slug}'`);
      return null;
    }

    // Parse commander info
    const rawCmd = jsonDict.card;
    const commander = rawCmd
      ? {
          name: rawCmd.name || commanderName,
          id: rawCmd.id || "",
          imageUri:
            rawCmd.image_uris?.[0]?.normal ||
            (rawCmd.id ? getEdhrecCardImageUrl(rawCmd.id) : null),
          numDecks: rawCmd.num_decks || 0,
          colorIdentity: rawCmd.color_identity || [],
          typeLine: rawCmd.type_line || "",
        }
      : null;

    // Parse cards from all cardlists
    const cardlists: EdhrecRawCardlist[] = jsonDict.cardlists || [];
    const cardMap = new Map<string, EdhrecParsedCard>();
    const categoryList: string[] = [];

    for (const list of cardlists) {
      const header = list.header || list.tag;
      if (!categoryList.includes(header)) {
        categoryList.push(header);
      }

      for (const cv of list.cardviews || []) {
        if (!cv.name) continue;
        const norm = normalizeCardName(cv.name);
        const existing = cardMap.get(norm);

        const numDecks = cv.num_decks ?? 0;
        const potentialDecks = cv.potential_decks ?? 1;
        const rawInclusion = potentialDecks > 0 ? (numDecks / potentialDecks) * 100 : 0;
        const inclusionPct = Math.round(rawInclusion * 10) / 10;
        const synergy = Math.round((cv.synergy ?? 0) * 1000) / 10; // e.g. 0.354 -> 35.4%
        const imageUri = cv.id ? getEdhrecCardImageUrl(cv.id) : null;

        if (!existing) {
          cardMap.set(norm, {
            id: cv.id || "",
            name: cv.name,
            normalizedName: norm,
            sanitized: cv.sanitized || "",
            category: header,
            categories: [header],
            numDecks,
            potentialDecks,
            inclusionPct,
            synergy,
            imageUri,
          });
        } else {
          // Add category
          if (!existing.categories.includes(header)) {
            existing.categories.push(header);
          }
          // If this list gives better stats (e.g. potential_decks wasn't available in earlier list), update
          if (inclusionPct > existing.inclusionPct) {
            existing.inclusionPct = inclusionPct;
            existing.numDecks = numDecks;
            existing.potentialDecks = potentialDecks;
          }
          if (synergy > existing.synergy) {
            existing.synergy = synergy;
          }
          if (!existing.imageUri && imageUri) {
            existing.imageUri = imageUri;
          }
        }
      }
    }

    // Sort cards by inclusion % descending
    const parsedCards = Array.from(cardMap.values()).sort(
      (a, b) => b.inclusionPct - a.inclusionPct
    );

    const result: EdhrecCommanderResponse = {
      commander,
      categories: categoryList,
      cards: parsedCards,
    };

    // Save to cache
    edhrecCache.set(slug, {
      timestamp: now,
      data: result,
    });

    return result;
  } catch (error) {
    console.error(`[EDHREC] Error fetching commander data for '${commanderName}' (${slug}):`, error);
    return null;
  }
}

export type CardOwnershipStatus = "in-deck" | "in-collection" | "missing";

export interface CardOwnershipClassification {
  category: CardOwnershipStatus;
  label: string;
  sublabel: string;
  badgeClass: string;
  isRequested: boolean;
  requestedDeckName?: string;
  requestedDecksCount: number;
}

/**
 * Classifies a card strictly according to physical inventory & deck status:
 * 1. "in-deck" (dentro del mazo y dentro de la colección):
 *    Card is in this deck AND owned in collection.
 * 2. "in-collection" (fuera del mazo y dentro de la colección):
 *    Card is owned in collection but NOT in this deck.
 * 3. "missing" (fuera del mazo y fuera de la colección):
 *    Card is NOT owned in collection.
 *    If listed in any deck, marked as "se pide en mazo: [Nombre]" (never says "en mazo" without physical ownership).
 */
export function getCardOwnershipCategory(
  card: {
    name: string;
    isInCollection: boolean;
    collectionQuantity?: number;
    isInDeck?: boolean;
    requestedInDecks?: Array<{ deckId: string; deckName: string; quantity?: number }>;
  },
  isCardInCurrentDeck: boolean,
  currentDeckId?: string,
  currentDeckName?: string
): CardOwnershipClassification {
  const isPhysicallyOwned = !!card.isInCollection && (card.collectionQuantity ?? 0) > 0;

  // State 1: En mazo (dentro del mazo y dentro de la colección)
  if (isCardInCurrentDeck && isPhysicallyOwned) {
    return {
      category: "in-deck",
      label: "En este mazo",
      sublabel: "Dentro del mazo y dentro de la colección",
      badgeClass: "text-emerald-400 bg-emerald-950/60 border-emerald-800/60",
      isRequested: false,
      requestedDecksCount: 0,
    };
  }

  // State 2: En colección (fuera del mazo y dentro de la colección)
  if (isPhysicallyOwned && !isCardInCurrentDeck) {
    return {
      category: "in-collection",
      label: `En colección (${card.collectionQuantity || 1})`,
      sublabel: "Fuera del mazo y dentro de la colección",
      badgeClass: "text-sky-300 bg-sky-950/60 border-sky-800/60",
      isRequested: false,
      requestedDecksCount: 0,
    };
  }

  // State 3: Fuera del mazo y fuera de la colección (!isPhysicallyOwned)
  // Check if requested in decks
  const reqList = card.requestedInDecks || [];

  // If in current deck list but not in collection
  if (isCardInCurrentDeck && !isPhysicallyOwned) {
    return {
      category: "missing",
      label: "Se pide en este mazo",
      sublabel: "En lista del mazo, faltante en colección",
      badgeClass: "text-amber-300 bg-amber-950/60 border-amber-800/60",
      isRequested: true,
      requestedDeckName: currentDeckName || "Este mazo",
      requestedDecksCount: Math.max(1, reqList.length),
    };
  }

  // If requested in other decks
  if (reqList.length > 0) {
    const firstDeck = reqList[0].deckName;
    return {
      category: "missing",
      label: reqList.length === 1 ? `Se pide en: ${firstDeck}` : `Se pide en ${reqList.length} mazos`,
      sublabel: "Fuera de la colección (se pide en mazo)",
      badgeClass: "text-amber-300 bg-amber-950/60 border-amber-800/60",
      isRequested: true,
      requestedDeckName: firstDeck,
      requestedDecksCount: reqList.length,
    };
  }

  return {
    category: "missing",
    label: "Faltante",
    sublabel: "Fuera del mazo y fuera de la colección",
    badgeClass: "text-rose-400 bg-rose-950/40 border-rose-900/40",
    isRequested: false,
    requestedDecksCount: 0,
  };
}
