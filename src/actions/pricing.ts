"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import {
  PriceProvider,
  PriceSummary,
  PriceMoversResponse,
  MoversScope,
  CardPriceHistoryResponse,
  CollectionValueHistoryResponse,
} from "@/lib/pricing/types";
import { CardToPrice } from "@/lib/pricing";

/**
 * Calculates or retrieves cached prices for all cards in a deck via FastAPI backend.
 */
export async function getDeckPriceSummary(
  deckId: string,
  provider: PriceProvider = "cardmarket"
): Promise<PriceSummary> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  return await backendFetch<PriceSummary>(`/api/pricing/decks/${encodeURIComponent(deckId)}?provider=${provider}`, {
    method: "POST",
    body: JSON.stringify({}),
    userId,
  });
}

export async function getCardsPriceSummary(
  cards: CardToPrice[],
  provider: PriceProvider = "cardmarket"
): Promise<PriceSummary> {
  provider = "cardmarket";
  return await backendFetch<PriceSummary>("/api/pricing/cards", {
    method: "POST",
    body: JSON.stringify({ cards, provider }),
    userId: await getCurrentUserId(),
  });
}

/**
 * Calculates or retrieves cached prices for the entire collection via FastAPI backend.
 */
export async function getCollectionPriceSummary(
  provider: PriceProvider = "cardmarket"
): Promise<PriceSummary> {
  provider = "cardmarket";
  const userId = await getCurrentUserId();
  return await backendFetch<PriceSummary>("/api/pricing", {
    method: "POST",
    body: JSON.stringify({
      includeCollection: true,
      provider,
    }),
    userId,
  });
}

export async function getPriceMovers(options: {
  provider?: PriceProvider;
  windowDays?: number;
  limit?: number;
  scope?: MoversScope;
} = {}): Promise<PriceMoversResponse> {
  const provider = "cardmarket";
  const {
    windowDays = 30,
    limit = 20,
    scope = "global",
  } = options;
  const params = new URLSearchParams({
    provider,
    windowDays: String(windowDays),
    limit: String(limit),
    scope,
  });
  return await backendFetch<PriceMoversResponse>(`/api/pricing/movers?${params.toString()}`, {
    method: "GET",
    userId: await getCurrentUserId(),
  });
}

export async function getCardPriceHistory(
  cardId: string,
  provider: PriceProvider = "cardmarket",
  days: number = 30
): Promise<CardPriceHistoryResponse> {
  provider = "cardmarket";
  const params = new URLSearchParams({
    provider,
    days: String(days),
  });
  return await backendFetch<CardPriceHistoryResponse>(
    `/api/catalog/cards/${encodeURIComponent(cardId)}/price-history?${params.toString()}`,
    {
      method: "GET",
      userId: await getCurrentUserId(),
      next: { revalidate: 3600 },
    }
  );
}

export async function getCollectionPriceHistory(
  provider: PriceProvider = "cardmarket",
  days: number = 30
): Promise<CollectionValueHistoryResponse> {
  provider = "cardmarket";
  const params = new URLSearchParams({
    provider,
    days: String(days),
  });
  return await backendFetch<CollectionValueHistoryResponse>(
    `/api/pricing/collection/history?${params.toString()}`,
    { method: "GET", userId: await getCurrentUserId() }
  );
}
