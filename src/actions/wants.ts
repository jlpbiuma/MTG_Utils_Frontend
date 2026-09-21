"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { PriceProvider } from "@/lib/pricing";
import { SortField, SortDirection } from "@/lib/sorting";
import type { DeckRequirement } from "@/lib/schemas";

export interface WantCardCreateInput {
  cardScryfallId: string;
  cardName: string;
  quantity?: number;
  setCode?: string | null;
  collectorNumber?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUri?: string | null;
}

export interface WantCardDTO {
  id: string;
  userId: string;
  cardScryfallId: string;
  cardName: string;
  quantity: number;
  setCode?: string | null;
  collectorNumber?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUri?: string | null;
  requestedInDecks?: DeckRequirement[];
  requestedInDecksCount?: number;
}

export interface WantQuerySection {
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
  cards: WantCardDTO[];
}

export interface WantQueryResponse {
  query: string;
  grouped: boolean;
  provider: string;
  currencySymbol: string;
  totalCards: number;
  uniqueCards: number;
  sections: WantQuerySection[];
  cards: WantCardDTO[];
}

export interface GetWantQueryOptions {
  searchQuery?: string;
  sort?: SortField;
  direction?: SortDirection;
  grouped?: boolean;
  priceProvider?: PriceProvider;
}

export async function getWantStats() {
  const userId = await getCurrentUserId();
  const stats = await backendFetch<{ totalCards: number; uniqueCards: number }>(
    "/api/wants/stats",
    { userId }
  );
  return {
    uniqueCards: stats.uniqueCards,
    totalCards: stats.totalCards,
  };
}

export async function getWantQuery(options: GetWantQueryOptions = {}) {
  const userId = await getCurrentUserId();
  const params = new URLSearchParams();
  if (options.searchQuery?.trim()) params.set("query", options.searchQuery.trim());
  if (options.sort) params.set("sort", options.sort);
  if (options.direction) params.set("direction", options.direction);
  if (options.grouped !== undefined) params.set("grouped", String(options.grouped));
  if (options.priceProvider) params.set("priceProvider", options.priceProvider);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  return await backendFetch<WantQueryResponse>(`/api/wants/query${queryString}`, {
    userId,
  });
}

export async function addOrIncrementWant(input: WantCardCreateInput) {
  const userId = await getCurrentUserId();
  const res = await backendFetch("/api/wants/add-or-increment", {
    method: "POST",
    body: JSON.stringify({
      cardScryfallId: input.cardScryfallId,
      cardName: input.cardName,
      quantity: input.quantity ?? 1,
      setCode: input.setCode,
      collectorNumber: input.collectorNumber,
      manaCost: input.manaCost,
      typeLine: input.typeLine,
      imageUri: input.imageUri,
    }),
    userId,
  });

  revalidatePath("/wants");
  revalidatePath("/decks");
  return res;
}

export async function updateWantQuantity(cardId: string, quantity: number) {
  const userId = await getCurrentUserId();
  const res = await backendFetch(`/api/wants/${cardId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
    userId,
  });

  revalidatePath("/wants");
  return res;
}

export async function deleteWantCard(cardId: string) {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/wants/${cardId}`, {
    method: "DELETE",
    userId,
  });

  revalidatePath("/wants");
  return { success: true };
}

export async function addDeckMissingToWants(deckId: string): Promise<{
  status: string;
  addedCount: number;
  uniqueCards: number;
  cards: string[];
}> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{
    status: string;
    addedCount: number;
    uniqueCards: number;
    cards: string[];
  }>(`/api/wants/add-deck-missing/${encodeURIComponent(deckId)}`, {
    method: "POST",
    userId,
  });

  revalidatePath("/wants");
  revalidatePath(`/decks/${deckId}`);
  return res;
}

