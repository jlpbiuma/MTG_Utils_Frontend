"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { CollectionCardCreateInput, CollectionCardCreateSchema } from "@/lib/schemas";

export async function getUserCollection(searchQuery?: string) {
  const userId = await getCurrentUserId();
  const queryParam = searchQuery ? `?query=${encodeURIComponent(searchQuery)}` : "";
  return await backendFetch(`/api/collection${queryParam}`, { userId });
}

export async function getCollectionStats() {
  const userId = await getCurrentUserId();
  const stats = await backendFetch<{ totalCards: number; uniqueCards: number }>("/api/collection/stats", { userId });
  return {
    uniqueCards: stats.uniqueCards,
    totalCards: stats.totalCards,
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
