"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";

export interface PurchaseGroup {
  key: string;
  quantity: number;
  purchaseCost: number;
  marketValue: number;
  comparedCost: number;
  comparedMarketValue: number;
  savings: number | null;
  comparedCopies: number;
  missingPurchasePriceCopies: number;
  missingMarketPriceCopies: number;
}

export interface PurchaseCard {
  cardName: string;
  quantity: number;
  collectorNumber?: string | null;
  setName?: string | null;
  sourceUrl?: string | null;
  condition?: string | null;
  isFoil: boolean;
  purchaseUnitPrice: number | null;
  purchaseTotal: number | null;
  marketUnitPrice: number | null;
  marketTotal: number | null;
  savings: number | null;
  referenceKind: "exact" | "approximate" | "unavailable";
  referenceSet?: string | null;
  referenceCollectorNumber?: string | null;
  inWants: boolean;
  inDecks: boolean;
  copiesOwned: number;
  wantsCoveredCopies: number;
}

export interface PurchaseAnalysis {
  currency: string;
  totalPurchaseCost: number;
  totalMarketValue: number;
  comparedPurchaseCost: number;
  comparedMarketValue: number;
  savings: number | null;
  savingsPercentage: number | null;
  comparedCopies: number;
  missingPurchasePriceCopies: number;
  missingMarketPriceCopies: number;
  approximatePriceCopies: number;
  wantsRequestedCopies: number;
  wantsCoveredCopies: number;
  wantsCompletionPercentage: number;
  wantsRequestedCards: number;
  wantsCompletedCards: number;
  wantsPurchaseCost: number;
  restPurchaseCost: number;
  wantsValueMinusTotalCost: number | null;
  warnings: string[];
  groups: PurchaseGroup[];
  cards: PurchaseCard[];
}

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
  selectedPrintingId?: string | null;
  inWants?: boolean;
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
  purchaseAnalysis?: PurchaseAnalysis | null;
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
  printingOverrides?: Record<string, string>;
  rawText?: string | null;
  purchaseAnalysis?: PurchaseAnalysis | null;
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
  provider: string = "cardmarket",
  printingOverrides: Record<string, string> = {}
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionAnalysisResponse>(
    "/api/simulated-collections/analyze-raw",
    {
      method: "POST",
      body: JSON.stringify({ rawText, provider, printingOverrides }),
      userId,
    }
  );
}

export async function createSimulatedCollection(
  name: string,
  description: string | undefined,
  rawText: string,
  provider: string = "cardmarket",
  printingOverrides: Record<string, string> = {}
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  const res = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections?provider=${encodeURIComponent(provider)}`,
    {
      method: "POST",
      body: JSON.stringify({ name, description, rawText, printingOverrides }),
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


export async function updateSimulatedCardVersion(
  collectionId: string, cardName: string, printingId: string, provider = "cardmarket"
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/card-version?provider=${encodeURIComponent(provider)}`,
    { method: "PUT", body: JSON.stringify({ cardName, printingId }), userId }
  );
  revalidatePath("/collection/simulated");
  return response;
}

export async function addCardToSimulatedCollection(
  collectionId: string, cardName: string, quantity = 1, provider = "cardmarket",
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/cards?provider=${encodeURIComponent(provider)}`,
    { method: "POST", body: JSON.stringify({ cardName, quantity }), userId },
  );
  revalidatePath("/collection/simulated");
  return response;
}

export async function removeCardFromSimulatedCollection(
  collectionId: string, cardName: string, provider = "cardmarket",
): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/cards?provider=${encodeURIComponent(provider)}`,
    { method: "DELETE", body: JSON.stringify({ cardName }), userId },
  );
  revalidatePath("/collection/simulated");
  return response;
}
