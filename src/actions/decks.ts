"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import {
  DeckCreateInput,
  DeckUpdateInput,
  DeckCardCreateInput,
  DeckSummary,
  DeckDetailWithStats,
  CommanderRecommendationsListResponse,
} from "@/lib/schemas";

export async function getUserDecks(): Promise<DeckSummary[]> {
  const userId = await getCurrentUserId();
  return await backendFetch<DeckSummary[]>("/api/decks", { userId });
}

export async function getDecksWithCompletion(): Promise<any[]> {
  const summaries = await getUserDecks();
  return summaries.map((d: any) => ({
    ...d,
    missingCardsCount: d.missingCards ?? d.missingCardsCount ?? 0,
    ownedCardsCount: d.ownedCards ?? d.ownedCardsCount ?? 0,
  }));
}

export async function getDeckDetail(deckId: string): Promise<DeckDetailWithStats | null> {
  const userId = await getCurrentUserId();
  try {
    return await backendFetch<DeckDetailWithStats>(`/api/decks/${deckId}`, { userId });
  } catch (error) {
    console.error(`Error getting deck ${deckId}:`, error);
    return null;
  }
}

export async function createDeck(data: DeckCreateInput): Promise<DeckSummary> {
  const userId = await getCurrentUserId();
  const created = await backendFetch<DeckSummary>("/api/decks", {
    method: "POST",
    body: JSON.stringify(data),
    userId,
  });

  revalidatePath("/decks");
  return created;
}

export async function updateDeck(
  deckId: string,
  data: DeckUpdateInput
): Promise<DeckSummary> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${deckId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    userId,
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  const updated = await getDeckDetail(deckId);
  return updated as any;
}

export interface DominoCandidate {
  cardName: string;
  cardScryfallId: string;
  releasedQuantity: number;
  targetDeckId: string;
  targetDeckName: string;
  targetDeckCardId: string;
  targetDeckCompletion: number;
  neededQuantity: number;
  canReassign: number;
}

export interface DeckDeletionImpact {
  deckId: string;
  deckName: string;
  totalAssignedCards: number;
  uniqueAssignedCards: number;
  dominoCandidates: DominoCandidate[];
}

export async function getDeckDeletionImpact(deckId: string): Promise<DeckDeletionImpact> {
  const userId = await getCurrentUserId();
  return await backendFetch<DeckDeletionImpact>(
    `/api/decks/${encodeURIComponent(deckId)}/deletion-impact`,
    { method: "GET", userId }
  );
}

export async function deleteDeck(
  deckId: string,
  reassignments?: { targetDeckCardId: string; quantity: number }[]
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${encodeURIComponent(deckId)}`, {
    method: "DELETE",
    body: JSON.stringify({ reassignments: reassignments || [] }),
    userId,
  });

  revalidatePath("/decks");
  revalidatePath("/collection");
  return { success: true };
}


export async function setDeckCommander(
  deckId: string,
  commander: string,
  commanderScryfallId?: string | null,
  commanderImageUri?: string | null,
  partner?: { name: string; scryfallId?: string | null; imageUri?: string | null }
): Promise<{ success: boolean; commander: string; commanderScryfallId?: string | null; commanderImageUri?: string | null }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${deckId}/commander`, {
    method: "PUT",
    body: JSON.stringify({
      commander,
      commanderScryfallId: commanderScryfallId || null,
      commanderImageUri: commanderImageUri || null,
      partner: partner?.name || null,
      partnerScryfallId: partner?.scryfallId || null,
      partnerImageUri: partner?.imageUri || null,
    }),
    userId,
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  return {
    success: true,
    commander,
    commanderScryfallId,
    commanderImageUri,
  };
}

export async function addCardToDeck(
  deckId: string,
  cardData: DeckCardCreateInput
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${deckId}/cards`, {
    method: "POST",
    body: JSON.stringify(cardData),
    userId,
  });

  revalidatePath(`/decks/${deckId}`);
  return { success: true };
}

export async function updateDeckCardQuantity(
  deckCardId: string,
  quantity: number
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${deckCardId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
    userId,
  });

  revalidatePath("/decks");
  return { success: true };
}

export async function updateDeckCardVersion(
  deckId: string,
  deckCardId: string,
  data: {
    cardScryfallId: string;
    imageUri?: string | null;
    setCode?: string | null;
    isCommander?: boolean;
  }
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${deckCardId}/version`, {
    method: "PATCH",
    body: JSON.stringify(data),
    userId,
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  return { success: true };
}

export async function removeCardFromDeck(deckCardId: string): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${deckCardId}`, {
    method: "DELETE",
    userId,
  });

  revalidatePath("/decks");
  return { success: true };
}

export async function updateDeckCardTags(
  cardId: string,
  tags: string[],
  deckId?: string
): Promise<{ success: boolean; tags: string[] }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; cardId: string; tags: string[] }>(
    `/api/decks/cards/${cardId}/tags`,
    {
      method: "PUT",
      body: JSON.stringify({ tags }),
      userId,
    }
  );

  if (deckId) {
    revalidatePath(`/decks/${deckId}`);
  }
  revalidatePath("/decks");
  return { success: true, tags: res.tags };
}

export async function updateDeckTags(
  deckId: string,
  tags: string[]
): Promise<{ success: boolean; tags: string[] }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; deckId: string; tags: string[] }>(
    `/api/decks/${deckId}/tags`,
    {
      method: "PUT",
      body: JSON.stringify({ tags }),
      userId,
    }
  );

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  return { success: true, tags: res.tags };
}

export async function removeCardFromDeckByName(
  deckId: string,
  cardName: string
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  const deck = await backendFetch<any>(`/api/decks/${deckId}`, { userId });
  if (deck && deck.cards) {
    const norm = cardName.trim().toLowerCase();
    const found = deck.cards.find(
      (c: any) => c.cardName?.trim().toLowerCase() === norm
    );
    if (found) {
      await backendFetch(`/api/decks/cards/${found.id}`, {
        method: "DELETE",
        userId,
      });
      revalidatePath(`/decks/${deckId}`);
      revalidatePath("/decks");
      return { success: true };
    }
  }
  return { success: false };
}

export async function unassignCardFromDeckByName(
  deckId: string,
  cardName: string
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  const deck = await backendFetch<any>(`/api/decks/${deckId}`, { userId });
  if (deck && deck.cards) {
    const norm = cardName.trim().toLowerCase();
    const found = deck.cards.find(
      (c: any) => c.cardName?.trim().toLowerCase() === norm
    );
    if (found) {
      await backendFetch(`/api/decks/cards/${found.id}/release`, {
        method: "POST",
        body: JSON.stringify({ quantity: 1 }),
        userId,
      });
      revalidatePath(`/decks/${deckId}`);
      revalidatePath("/decks");
      return { success: true };
    }
  }
  return { success: false };
}

export async function assignCollectionCardToDeck(
  deckCardId: string,
  quantityToAssign: number = 1
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${deckCardId}/assign`, {
    method: "POST",
    body: JSON.stringify({ quantity: quantityToAssign }),
    userId,
  });

  revalidatePath("/decks");
  return { success: true };
}

export async function releaseCollectionCardFromDeck(
  deckCardId: string,
  quantityToRelease: number = 1
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${deckCardId}/release`, {
    method: "POST",
    body: JSON.stringify({ quantity: quantityToRelease }),
    userId,
  });

  revalidatePath("/decks");
  return { success: true };
}

export async function reassignCardFromOtherDeck(
  fromDeckId: string,
  toDeckCardId: string,
  cardName?: string,
  quantityToMove: number = 1
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/cards/${toDeckCardId}/reassign`, {
    method: "POST",
    body: JSON.stringify({ sourceDeckId: fromDeckId, quantity: quantityToMove }),
    userId,
  });

  revalidatePath("/decks");
  return { success: true };
}

export async function addMissingCardsToCollection(
  deckId: string
): Promise<{ success: boolean; addedCount: number }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; addedCount: number }>(`/api/decks/${deckId}/add-missing`, {
    method: "POST",
    userId,
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  revalidatePath("/collection");
  return { success: true, addedCount: res.addedCount };
}

export async function addMissingCardToCollection(
  deckId: string,
  deckCardId: string
): Promise<{ success: boolean; addedCount: number }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; addedCount: number }>(
    `/api/decks/cards/${deckCardId}/add-missing`,
    {
      method: "POST",
      userId,
    }
  );

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/decks");
  revalidatePath("/collection");
  return { success: true, addedCount: res.addedCount };
}

// Aliases for component backwards compatibility
export const assignCardToDeck = assignCollectionCardToDeck;
export const unassignCardFromDeck = releaseCollectionCardFromDeck;
export const reassignCardToDeck = reassignCardFromOtherDeck;

export interface DeckOverlapSharedCard {
  cardName: string;
  cardScryfallId: string;
  imageUri: string | null;
  manaCost: string | null;
  typeLine: string | null;
  deckACardId: string;
  deckAQuantity: number;
  deckAAssigned: number;
  deckBCardId: string;
  deckBQuantity: number;
  deckBAssigned: number;
}

export interface DeckOverlapPair {
  deckAId: string;
  deckAName: string;
  deckBId: string;
  deckBName: string;
  sharedCount: number;
  overlapPercentage: number;
  sharedCards: DeckOverlapSharedCard[];
}

export interface DeckOverlapSummary {
  id: string;
  name: string;
  commander: string | null;
  commanderImageUri: string | null;
  colors: string[];
  totalCards: number;
  nonBasicCardsCount: number;
}

export interface DecksOverlapResponse {
  decks: DeckOverlapSummary[];
  pairs: DeckOverlapPair[];
}

export async function getDecksOverlap(): Promise<DecksOverlapResponse> {
  const userId = await getCurrentUserId();
  return await backendFetch<DecksOverlapResponse>("/api/decks/overlap", {
    method: "GET",
    userId,
  });
}

export async function archiveDeck(
  deckId: string,
  isArchived: boolean = true
): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${encodeURIComponent(deckId)}/archive?archived=${isArchived}`, {
    method: "PATCH",
    userId,
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/priorities");
  revalidatePath("/collection");
  return { success: true };
}

export async function moveCardToSideboard(
  cardId: string,
  isSideboard: boolean,
  deckId?: string
): Promise<{ success: boolean; cardId?: string; merged?: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ status: string; cardId?: string; merged?: boolean }>(
    `/api/decks/cards/${encodeURIComponent(cardId)}/sideboard`,
    {
      method: "PATCH",
      body: JSON.stringify({ isSideboard }),
      userId,
    }
  );
  if (deckId) {
    revalidatePath(`/decks/${deckId}`);
  }
  revalidatePath("/decks");
  return { success: res.status === "success", cardId: res.cardId, merged: res.merged };
}

export type CommanderRecommendationsSortBy =
  | "completion"
  | "rank"
  | "name"
  | "owned_value"
  | "missing_value"
  | "synergy"
  | "top_cards";

export interface GetEdhrecRecommendationsParams {
  search?: string;
  colors?: string;
  top100Only?: boolean;
  ownedCommanderOnly?: boolean;
  sortBy?: CommanderRecommendationsSortBy;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function getEdhrecCommanderRecommendations(
  params: GetEdhrecRecommendationsParams = {}
): Promise<CommanderRecommendationsListResponse> {
  const userId = await getCurrentUserId();
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.colors) searchParams.set("colors", params.colors);
  if (params.top100Only) searchParams.set("top100_only", "true");
  if (params.ownedCommanderOnly) searchParams.set("owned_commander_only", "true");
  if (params.sortBy) searchParams.set("sort_by", params.sortBy);
  if (params.sortDir) searchParams.set("sort_dir", params.sortDir);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.pageSize) searchParams.set("page_size", params.pageSize.toString());

  const query = searchParams.toString();
  const endpoint = `/api/edhrec/commanders${query ? `?${query}` : ""}`;
  return await backendFetch<CommanderRecommendationsListResponse>(endpoint, { userId });
}

