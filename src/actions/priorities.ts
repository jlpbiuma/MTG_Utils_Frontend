"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

export interface DeckReassignOption {
  sourceDeckId: string;
  sourceDeckName: string;
  sourceDeckCompletion: number;
  assignedQuantity: number;
  targetDeckId: string;
  targetDeckName: string;
  targetDeckCompletion: number;
  missingQuantity: number;
  targetDeckCardId: string;
}

export interface PriorityDeckInfo {
  deckId: string;
  deckName: string;
  completionPercentage: number;
  colors: string[];
  requestedQuantity: number;
  assignedQuantity: number;
  missingQuantity: number;
  deckCardId: string;
  potentialGain?: number;
}

export interface PriorityItem {
  cardName: string;
  cardScryfallId: string;
  imageUri?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  cardType?: string;
  numDecks: number;
  decks: PriorityDeckInfo[];
  copiesOwned: number;
  copiesNeeded: number;
  deficit: number;
  price: number;
  totalDeficitCost: number;
  isReassignable: boolean;
  reassignOptions: DeckReassignOption[];
  maxDeckCompletion: number;
  maxPotentialGain?: number;
  avgPotentialGain?: number;
  netCompletionGain?: number;
  sumPointsGain?: number;
}

export interface PrioritiesResponse {
  totalUniqueCards: number;
  totalDeficitCopies: number;
  totalDeficitCost: number;
  currencySymbol: string;
  provider: string;
  page?: number;
  limit?: number;
  totalItems?: number;
  hasMore?: boolean;
  items: PriorityItem[];
}

export async function getPriorities(options: {
  sort?: "demand" | "impact" | "completion";
  reassignableOnly?: boolean;
  hideOwned?: boolean;
  cardType?: string;
  page?: number;
  limit?: number;
  provider?: string;
} = {}): Promise<PrioritiesResponse> {
  const {
    sort = "demand",
    reassignableOnly = false,
    hideOwned = false,
    cardType,
    page = 1,
    limit = 30,
    provider = "cardmarket",
  } = options;

  const params = new URLSearchParams({
    sort,
    reassignableOnly: String(reassignableOnly),
    hideOwned: String(hideOwned),
    page: String(page),
    limit: String(limit),
    provider,
  });

  if (cardType && cardType !== "all") {
    params.set("cardType", cardType);
  }

  return await backendFetch<PrioritiesResponse>(
    `/api/priorities?${params.toString()}`,
    {
      method: "GET",
      userId: await getCurrentUserId(),
    }
  );
}

export async function reassignCardBetweenDecks(
  targetCardId: string,
  sourceDeckId: string,
  quantity: number = 1
): Promise<{ success: boolean; reallocated: number }> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<{ success: boolean; reallocated: number }>(
    "/api/decks/reassign-from-deck",
    {
      method: "POST",
      body: JSON.stringify({
        targetDeckCardId: targetCardId,
        sourceDeckId,
        quantity,
      }),
      userId,
    }
  );

  revalidatePath("/priorities");
  revalidatePath("/decks");
  return res;
}
