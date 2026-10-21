"use server";

import type { UpcomingReprint } from "@/lib/upcoming-reprints";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "./auth";
import type { PriceHistoryStatistics } from "@/lib/pricing/types";
import type { WhatsAppMatchesResponse } from "./whatsapp-matches";
import { BackendRequestError, backendFetch } from "@/lib/api-client";
import { normalizeCardName } from "@/lib/card-utils";

export type OfferOrigin = "whatsapp" | "cardmarket" | "in_person" | "other";

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
  historyPrintingId?: string | null;
  historyStatistics?: PriceHistoryStatistics | null;
  referencePrintingId?: string | null; referenceSetCode?: string | null;
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
  historyStatistics?: PriceHistoryStatistics | null;
  historyCoveredCopies?: number;
  missingHistoryCopies?: number;
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
  totalCards?: number | null;
  ownedCards?: number | null;
}

export interface SimulatedCardAnalysisItem {
  upcomingReprints?: UpcomingReprint[];
  historyStatistics?: PriceHistoryStatistics | null;
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
  origin?: OfferOrigin;
  opportunitySubject?: "vende" | "compra_busca";
  globalCompletionBefore?: number;
  globalCompletionAfter?: number;
  opportunityMatches?: WhatsAppMatchesResponse | null;
  status?: "evaluating" | "purchased" | "discarded";
  seller?: string | null; shipping?: number; sourceUrl?: string | null; paidTotal?: number | null; confirmedBatchId?: string | null;

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
  valuationRevision?: string | null;
  origin?: OfferOrigin;
  opportunitySubject?: "vende" | "compra_busca";
  globalCompletionBefore?: number;
  globalCompletionAfter?: number;
  opportunityMatches?: WhatsAppMatchesResponse | null;
  historyStatistics?: PriceHistoryStatistics | null;
  historyCoveredCopies?: number;
  missingHistoryCopies?: number;
  status?: "evaluating" | "purchased" | "discarded";
  seller?: string | null; shipping?: number; sourceUrl?: string | null; paidTotal?: number | null; confirmedBatchId?: string | null;

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
  printingOverrides: Record<string, string> = {},
  origin?: OfferOrigin
): Promise<SimulatedCollectionAnalysisResponse> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionAnalysisResponse>(
    "/api/simulated-collections/analyze-raw",
    {
      method: "POST",
      body: JSON.stringify({ rawText, provider, printingOverrides, ...(origin ? { includeHistory: origin === "cardmarket" } : {}) }),
      userId,
    }
  );
}

export async function createSimulatedCollection(
  name: string,
  description: string | undefined,
  rawText: string,
  provider: string = "cardmarket",
  printingOverrides: Record<string, string> = {},
  origin: OfferOrigin = "other"
): Promise<SimulatedCollectionAnalysisResponse> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  const res = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections?provider=${encodeURIComponent(provider)}`,
    {
      method: "POST",
      body: JSON.stringify({ name, description, rawText, printingOverrides, origin }),
      userId,
    }
  );
  revalidatePath("/buy/offers");
  return res;
}

export async function getSimulatedCollections(
  provider: string = "cardmarket"
): Promise<SimulatedCollectionSummary[]> {
  provider = "cardmarket";
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
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  return await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${id}?provider=${encodeURIComponent(provider)}`,
    { userId }
  );
}

/** Loads an offer before confirming it without letting a backend exception
 * abort the Server Components response sent to the client. */
export async function loadOfferReview(
  id: string,
): Promise<
  | { ok: true; data: SimulatedCollectionAnalysisResponse }
  | { ok: false; error: string }
> {
  try {
    return { ok: true, data: await getSimulatedCollection(id, "cardmarket") };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof BackendRequestError
          ? error.userMessage
          : "No se pudo preparar la confirmación de compra. Inténtalo de nuevo.",
    };
  }
}

export async function deleteSimulatedCollection(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  await backendFetch(`/api/simulated-collections/${id}`, {
    method: "DELETE",
    userId,
  });
  revalidatePath("/buy/offers");
}


export async function updateSimulatedCardVersion(
  collectionId: string, cardName: string, printingId: string, provider = "cardmarket"
): Promise<SimulatedCollectionAnalysisResponse> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/card-version?provider=${encodeURIComponent(provider)}`,
    { method: "PUT", body: JSON.stringify({ cardName, printingId }), userId }
  );
  return response;
}

export async function addCardToSimulatedCollection(
  collectionId: string, cardName: string, quantity = 1, provider = "cardmarket",
): Promise<SimulatedCollectionAnalysisResponse> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/cards?provider=${encodeURIComponent(provider)}`,
    { method: "POST", body: JSON.stringify({ cardName, quantity }), userId },
  );
  revalidatePath("/buy/offers");
  return response;
}

export async function removeCardFromSimulatedCollection(
  collectionId: string, cardName: string, provider = "cardmarket",
): Promise<SimulatedCollectionAnalysisResponse> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  const response = await backendFetch<SimulatedCollectionAnalysisResponse>(
    `/api/simulated-collections/${encodeURIComponent(collectionId)}/cards?provider=${encodeURIComponent(provider)}`,
    { method: "DELETE", body: JSON.stringify({ cardName }), userId },
  );
  revalidatePath("/buy/offers");
  return response;
}


export async function importOfferLink(input: { url: string; name?: string; origin: OfferOrigin; subject: "vende" | "compra_busca"; savedOnly?: boolean }): Promise<SimulatedCollectionAnalysisResponse> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Inicia sesión para evaluar una oferta.");
  const result = await backendFetch<SimulatedCollectionAnalysisResponse>("/api/offers/import-link", {
    method: "POST", userId, body: JSON.stringify(input),
  });
  revalidatePath("/buy/offers");
  return result;
}


export async function getDiscoveredOffers(): Promise<SimulatedCollectionSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return await backendFetch<SimulatedCollectionSummary[]>("/api/offers/discovered", { userId, cache: "no-store" });
}


export async function applySimulatedPrinting(input: {
  collectionId?: string;
  rawText: string;
  origin?: OfferOrigin;
  cardName: string;
  printingId: string;
  provider?: string;
  printingOverrides?: Record<string, string>;
}): Promise<{ ok: true; data: SimulatedCollectionAnalysisResponse } | { ok: false; error: string }> {
  try {
    const provider = input.provider ?? "cardmarket";
    const data = input.collectionId
      ? await updateSimulatedCardVersion(input.collectionId, input.cardName, input.printingId, provider)
      : await analyzeRawSimulatedCollection(input.rawText, provider, { ...input.printingOverrides, [normalizeCardName(input.cardName)]: input.printingId }, input.origin);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof BackendRequestError ? error.userMessage : "No se pudo cambiar la impresión. Inténtalo de nuevo." };
  }
}
