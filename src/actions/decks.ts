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

export async function deleteDeck(deckId: string): Promise<{ success: boolean }> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/decks/${deckId}`, {
    method: "DELETE",
    userId,
  });

  revalidatePath("/decks");
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
  revalidatePath("/collection");
  return { success: true, addedCount: res.addedCount };
}

// Aliases for component backwards compatibility
export const assignCardToDeck = assignCollectionCardToDeck;
export const unassignCardFromDeck = releaseCollectionCardFromDeck;
export const reassignCardToDeck = reassignCardFromOtherDeck;
