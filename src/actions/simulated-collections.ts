"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";

export interface CandidateDeckInfo {
  deckId: string;
  deckName: string;
  completionPercentage: number;
  colors: string[];
  requestedQuantity: number;
  assignedQuantity: number;
  missingQuantity: number;
  potentialGain: number;
}

export interface SimulatedCardAnalysisItem {
  cardName: string;
  cardScryfallId?: string | null;
  quantity: number;
  setCode?: string | null;
  collectorNumber?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  imageUri?: string | null;
  unitPrice: number;
  totalPrice: number;
  copiesOwnedReal: number;
  copiesNeededTotal: number;
  usefulCopies: number;
  surplusCopies: number;
  sellableCopies: number;
  sellableValue: number;
  netCompletionGain: number;
  candidateDeckCount: number;
  candidateDecks: CandidateDeckInfo[];
}

export interface SimulatedCollectionSummary {
  id: string;
  name: string;
  description?: string | null;
  totalCards: number;
  uniqueCards: number;
  totalEconomicValue: number;
  economicValueExcludingOwned: number;
  sellableValue: number;
  sellableCardsCount: number;
  globalNetGain: number;
  usefulCardsCount: number;
  alreadyOwnedCardsCount: number;
  benefitedDecksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedCollectionAnalysisResponse {
  id?: string | null;
  name: string;
  description?: string | null;
  totalEconomicValue: number;
  economicValueExcludingOwned: number;
  sellableValue: number;
  sellableCardsCount: number;
  currencySymbol: string;
  globalNetGain: number;
  totalCards: number;
  uniqueCards: number;
  usefulCardsCount: number;
  alreadyOwnedCardsCount: number;
  benefitedDecksCount: number;
  cards: SimulatedCardAnalysisItem[];
}



export async function analyzeRawSimulatedCollection(
  rawText: string,
  provider: string = "cardmarket"
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionAnalysisResponse>(
    "/api/simulated-collections/analyze-raw",
    {
      method: "POST",
      body: JSON.stringify({ rawText, provider }),
      userId,
    }
  );
}

export async function createSimulatedCollection(
  name: string,
  description: string | undefined,
  rawText: string,
  provider: string = "cardmarket"
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections?provider=${encodeURIComponent(provider)}`,
    {
      method: "POST",
      body: JSON.stringify({ name, description, rawText }),
      userId,
    }
  );
  revalidatePath("/collection");
  return res;
}

export async function getSimulatedCollections(
  provider: string = "cardmarket"
): Promise<SimulatedCollectionSummary[]> {
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionSummary[]>(
    `/api/simulated-collections?provider=${encodeURIComponent(provider)}`,
    { userId }
  );
}

export async function getSimulatedCollection(
  id: string,
  provider: string = "cardmarket"
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${id}?provider=${encodeURIComponent(provider)}`,
    { userId }
  );
}

export async function deleteSimulatedCollection(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/simulated-collections/${id}`, {
    method: "DELETE",
    userId,
  });
  revalidatePath("/collection");
}
