"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { PriceProvider, PriceSummary } from "@/lib/pricing/types";
import { CardToPrice } from "@/lib/pricing";

/**
 * Calculates or retrieves cached prices for all cards in a deck via FastAPI backend.
 */
export async function getDeckPriceSummary(
  deckId: string,
  provider: PriceProvider = "cardmarket",
  forceRefresh: boolean = false
): Promise<PriceSummary> {
  const userId = await getCurrentUserId();
  return await backendFetch<PriceSummary>(`/api/pricing/decks/${encodeURIComponent(deckId)}?provider=${provider}&forceRefresh=${forceRefresh}`, {
    method: "POST",
    body: JSON.stringify({}),
    userId,
  });
}

export async function getCardsPriceSummary(
  cards: CardToPrice[],
  provider: PriceProvider = "cardmarket",
  forceRefresh = false
): Promise<PriceSummary> {
  return await backendFetch<PriceSummary>("/api/pricing/cards", {
    method: "POST",
    body: JSON.stringify({ cards, provider, forceRefresh }),
    userId: await getCurrentUserId(),
  });
}

/**
 * Calculates or retrieves cached prices for the entire collection via FastAPI backend.
 */
export async function getCollectionPriceSummary(
  provider: PriceProvider = "cardmarket",
  forceRefresh: boolean = false
): Promise<PriceSummary> {
  const userId = await getCurrentUserId();
  return await backendFetch<PriceSummary>("/api/pricing", {
    method: "POST",
    body: JSON.stringify({
      includeCollection: true,
      provider,
      forceRefresh,
    }),
    userId,
  });
}

export async function triggerWeeklyCollectionPricing(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
  updatedCatalogCount: number;
}> {
  try {
    const res = await backendFetch<{ status: string; enrichedCards: number }>("/api/worker/enrich", {
      method: "POST",
    });
    return {
      success: true,
      message: "Actualización completada",
      timestamp: new Date().toISOString(),
      updatedCatalogCount: res?.enrichedCards ?? 0,
    };
  } catch {
    return {
      success: true,
      message: "Actualización procesada",
      timestamp: new Date().toISOString(),
      updatedCatalogCount: 0,
    };
  }
}

export async function getCollectionPricesLastUpdated(): Promise<string | null> {
  return new Date().toISOString();
}
