"use server";

import { backendFetch } from "@/lib/api-client";

export interface ScryfallCardResult {
  id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    art_crop?: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
      art_crop?: string;
    };
  }>;
}

export async function searchCards(
  query: string,
  page: number = 1
): Promise<{ total_cards: number; has_more: boolean; data: ScryfallCardResult[] }> {
  if (!query || query.trim().length === 0) {
    return { total_cards: 0, has_more: false, data: [] };
  }

  try {
    return await backendFetch(
      `/api/scryfall/search?q=${encodeURIComponent(query.trim())}&page=${page}`
    );
  } catch (error) {
    console.error("Error searching cards via backend:", error);
    return { total_cards: 0, has_more: false, data: [] };
  }
}

export async function autocompleteCards(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await backendFetch(
      `/api/scryfall/autocomplete?q=${encodeURIComponent(query.trim())}`
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Error in autocomplete via backend:", error);
    return [];
  }
}

export async function getCardNamed(
  name: string,
  exact: boolean = false
): Promise<ScryfallCardResult | null> {
  if (!name || name.trim().length === 0) return null;

  try {
    const card = await backendFetch(
      `/api/scryfall/named?name=${encodeURIComponent(name.trim())}&exact=${exact}`
    );
    return card?.id ? card : null;
  } catch (error) {
    console.error(`Error fetching card '${name}' via backend:`, error);
    return null;
  }
}

export async function resolveCardsInBulk(
  identifiers: Array<{ id?: string; name?: string }>
): Promise<ScryfallCardResult[]> {
  if (!identifiers || identifiers.length === 0) return [];

  try {
    return await backendFetch("/api/scryfall/bulk", {
      method: "POST",
      body: JSON.stringify(identifiers),
    });
  } catch (error) {
    console.error("Error resolving cards in bulk via backend:", error);
    return [];
  }
}
