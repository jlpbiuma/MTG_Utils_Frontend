"use server";

import { getCurrentUserId } from "@/actions/auth";
import { backendFetch } from "@/lib/api-client";

export interface Expansion {
  code: string;
  name: string;
  setType: string;
  cardCount: number;
  releasedAt?: string | null;
  iconSvgUri?: string | null;
  ownedCount: number;
  completionPercentage: number;
  totalValueEur: number;
  ownedValueEur: number;
  missingValueEur: number;
}

export interface ExpansionValuePoint { date: string; totalValue: number; ownedValue: number }
export interface ExpansionValueHistory {
  setCode: string; windowDays: number; currency: string; currencySymbol: string;
  currentTotalValue: number; currentOwnedValue: number; points: ExpansionValuePoint[];
}

export interface ExpansionCard {
  id: string;
  catalogId?: string | null;
  setCode: string;
  collectorNumber: string;
  rarity?: string | null;
  imageUri?: string | null;
  priceCardmarketTrend?: number | null;
  priceCardmarketMin?: number | null;
  priceCardmarketMax?: number | null;
  priceTrendAbsoluteChange?: number | null;
  priceTrendPercentageChange?: number | null;
  cardName?: string | null;
  typeLine?: string | null;
  manaCost?: string | null;
  isOwned: boolean;
  ownedQuantity: number;
  ownedElsewhere?: boolean;
  otherPrintings?: Array<{ setCode: string; collectorNumber: string; quantity: number }>;
  collectionCardId?: string | null;
  acquiredAt?: string | null;
  acquisitionTrendAbsoluteChange?: number | null;
  acquisitionTrendPercentageChange?: number | null;
}

export async function getExpansions(): Promise<Expansion[]> {
  const userId = await getCurrentUserId();
  try {
    return await backendFetch<Expansion[]>("/api/catalog/sets?limit=2000", { userId });
  } catch (error) {
    console.error("Error cargando expansiones:", error);
    return [];
  }
}

export async function getExpansionCards(code: string): Promise<ExpansionCard[]> {
  const userId = await getCurrentUserId();
  try {
    return await backendFetch<ExpansionCard[]>(
      `/api/catalog/sets/${encodeURIComponent(code)}/cards`,
      { userId },
    );
  } catch (error) {
    console.error(`Error cargando cartas de ${code}:`, error);
    throw error;
  }
}

export async function getExpansionValueHistory(code: string, days = 7): Promise<ExpansionValueHistory> {
  const userId = await getCurrentUserId();
  return backendFetch<ExpansionValueHistory>(
    `/api/catalog/sets/${encodeURIComponent(code)}/value-history?days=${days}`,
    { userId },
  );
}

export async function setExpansionMissingAcquisitionDates(code: string, acquiredAt: string): Promise<{ updatedCount: number }> {
  const userId = await getCurrentUserId();
  return backendFetch<{ updatedCount: number }>(
    `/api/catalog/sets/${encodeURIComponent(code)}/acquisition-dates`,
    { method: "PATCH", body: JSON.stringify({ acquiredAt }), userId },
  );
}
