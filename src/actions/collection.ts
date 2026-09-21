"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { CollectionCardCreateInput, CollectionCardCreateSchema, type DeckRequirement } from "@/lib/schemas";
import { PriceProvider } from "@/lib/pricing";
import { SortField, SortDirection } from "@/lib/sorting";

export interface GetUserCollectionOptions {
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export async function getUserCollection(
  optionsOrQuery?: string | GetUserCollectionOptions
) {
  const userId = await getCurrentUserId();
  let query = "";
  let limit: number | undefined;
  let offset: number | undefined;

  if (typeof optionsOrQuery === "string") {
    query = optionsOrQuery;
  } else if (optionsOrQuery) {
    query = optionsOrQuery.searchQuery || "";
    limit = optionsOrQuery.limit;
    offset = optionsOrQuery.offset;
  }

  const params = new URLSearchParams();
  if (query.trim()) params.set("query", query.trim());
  if (limit !== undefined && limit !== null) params.set("limit", limit.toString());
  if (offset !== undefined && offset !== null) params.set("offset", offset.toString());

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return await backendFetch<any[]>(`/api/collection${queryString}`, { userId });
}

export async function getCollectionStats() {
  const userId = await getCurrentUserId();
  const stats = await backendFetch<{ totalCards: number; uniqueCards: number; decksCount?: number }>("/api/collection/stats", { userId });
  return {
    uniqueCards: stats.uniqueCards,
    totalCards: stats.totalCards,
    decksCount: stats.decksCount ?? 0,
  };
}

export async function addOrIncrementCard(input: CollectionCardCreateInput) {
  const userId = await getCurrentUserId();
  const validated = CollectionCardCreateSchema.parse(input);

  const res = await backendFetch("/api/collection/add-or-increment", {
    method: "POST",
    body: JSON.stringify(validated),
    userId,
  });

  revalidatePath("/collection");
  revalidatePath("/decks");
  return res;
}

export async function updateCollectionQuantity(cardId: string, quantity: number) {
  const userId = await getCurrentUserId();

  const res = await backendFetch(`/api/collection/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
    userId,
  });

  revalidatePath("/collection");
  revalidatePath("/decks");
  return res;
}

export async function deleteCollectionCard(cardId: string) {
  const userId = await getCurrentUserId();

  await backendFetch(`/api/collection/${cardId}`, {
    method: "DELETE",
    userId,
  });

  revalidatePath("/collection");
  revalidatePath("/decks");
  return { success: true };
}

export async function deleteCardFromCollectionByName(cardName: string): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  const cards = await backendFetch<any[]>(`/api/collection?query=${encodeURIComponent(cardName.trim())}`, { userId });
  const norm = cardName.trim().toLowerCase();
  const match = (cards || []).find((c: any) => c.cardName?.trim().toLowerCase() === norm);
  if (match) {
    await backendFetch(`/api/collection/${match.id}`, {
      method: "DELETE",
      userId,
    });
    revalidatePath("/collection");
    revalidatePath("/decks");
    return { success: true };
  }
  return { success: false };
}

export async function decrementCardInCollectionByName(
  cardName: string
): Promise<{ success: boolean; remainingQuantity?: number }> {
  const userId = await getCurrentUserId();
  const cards = await backendFetch<any[]>(`/api/collection?query=${encodeURIComponent(cardName.trim())}`, { userId });
  const norm = cardName.trim().toLowerCase();
  const match = (cards || []).find((c: any) => c.cardName?.trim().toLowerCase() === norm);
  if (match) {
    const newQty = (match.quantity || 1) - 1;
    if (newQty <= 0) {
      await backendFetch(`/api/collection/${match.id}`, {
        method: "DELETE",
        userId,
      });
      revalidatePath("/collection");
      revalidatePath("/decks");
      return { success: true, remainingQuantity: 0 };
    } else {
      await backendFetch(`/api/collection/${match.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: newQty }),
        userId,
      });
      revalidatePath("/collection");
      revalidatePath("/decks");
      return { success: true, remainingQuantity: newQty };
    }
  }
  return { success: false };
}

export interface CollectionCardDTO {
  id: string;
  userId: string;
  cardScryfallId: string;
  cardName: string;
  quantity: number;
  isFoil?: boolean;
  setCode?: string | null;
  collectorNumber?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUri?: string | null;
  requestedInDecks?: DeckRequirement[];
  requestedInDecksCount?: number;
}

export interface CollectionQuerySection {
  key: string;
  label: string;
  order: number;
  totalCards: number;
  uniqueCards: number;
  ownedCards: number;
  missingCards: number;
  completionPercentage: number;
  sectionTotalPrice: number;
  sectionMissingPrice: number;
  sectionOwnedPrice: number;
  currencySymbol: string;
  cards: CollectionCardDTO[];
}

export interface CollectionQueryResponse {
  query: string;
  grouped: boolean;
  provider: string;
  currencySymbol: string;
  totalCards: number;
  uniqueCards: number;
  sections: CollectionQuerySection[];
  cards: CollectionCardDTO[];
}

export interface GetCollectionQueryOptions {
  searchQuery?: string;
  sort?: SortField;
  direction?: SortDirection;
  grouped?: boolean;
  priceProvider?: PriceProvider;
}

/**
 * Fetches the WHOLE collection filtered, sorted and grouped on the backend,
 * so no grouping/sorting/filtering is ever performed over partial frontend data.
 */
export async function getCollectionQuery(options: GetCollectionQueryOptions = {}) {
  const userId = await getCurrentUserId();

  const params = new URLSearchParams();
  if (options.searchQuery?.trim()) params.set("query", options.searchQuery.trim());
  if (options.sort) params.set("sort", options.sort);
  if (options.direction) params.set("direction", options.direction);
  if (options.grouped !== undefined) params.set("grouped", String(options.grouped));
  if (options.priceProvider) params.set("priceProvider", options.priceProvider);
  if (params.has("query") || params.has("sort") || params.has("direction") || params.has("grouped")) {
    params.sort();
  }

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return await backendFetch<CollectionQueryResponse>(
    `/api/collection/query${queryString}`,
    { userId }
  );
}

export interface DormantCardItem {
  id: string;
  cardScryfallId: string;
  cardName: string;
  isFoil: boolean;
  quantity: number;
  setCode?: string | null;
  collectorNumber?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUri?: string | null;
  price: number;
  totalValue: number;
}

export interface DormantCardsResponse {
  totalCards: number;
  uniqueCards: number;
  totalValue: number;
  currencySymbol: string;
  provider: string;
  activeCommanders: string[];
  cards: DormantCardItem[];
}

export async function getDormantCards(options: {
  minPrice?: number;
  provider?: string;
} = {}): Promise<DormantCardsResponse> {
  const { minPrice = 0, provider = "cardmarket" } = options;
  const userId = await getCurrentUserId();
  const params = new URLSearchParams({
    minPrice: String(minPrice),
    provider,
  });
  return await backendFetch<DormantCardsResponse>(
    `/api/collection/dormant?${params.toString()}`,
    { method: "GET", userId }
  );
}

