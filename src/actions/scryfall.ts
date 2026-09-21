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

export interface SpanishCardLegality {
  format: string;
  format_name: string;
  status: string;
  status_es: string;
}

export interface CardPrintingDetail {
  id: string;
  set_code: string;
  set_name?: string | null;
  collector_number: string;
  rarity?: string | null;
  name_es?: string | null;
  image_uri?: string | null;
  image_uri_small?: string | null;
  image_uri_large?: string | null;
  trend?: number | null;
  min?: number | null;
  max?: number | null;
  cardtrader_trend?: number | null;
  cardtrader_min?: number | null;
  cardtrader_max?: number | null;
  price_eur?: number | null;
  price_eur_foil?: number | null;
  price_usd?: number | null;
  price_usd_foil?: number | null;
  released_at?: string | null;
  set_type?: string | null;
  icon_svg_uri?: string | null;
}

export interface CardRulingDetail {
  date: string;
  text: string;
  source?: string;
}

export interface SpanishCardFace {
  name: string;
  name_es: string;
  mana_cost?: string;
  type_line?: string;
  type_line_es?: string;
  oracle_text?: string;
  oracle_text_es?: string;
  flavor_text_es?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
  };
}

export interface SpanishCardDetails {
  id: string;
  name: string;
  name_es: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  type_line_es?: string;
  oracle_text?: string;
  oracle_text_es?: string;
  flavor_text?: string;
  flavor_text_es?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  rarity?: string;
  rarity_es: string;
  set: string;
  set_name?: string;
  collector_number?: string;
  artist?: string;
  has_spanish_print: boolean;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
  };
  card_faces?: SpanishCardFace[];
  legalities?: SpanishCardLegality[];
  prices?: {
    eur?: string | null;
    eur_foil?: string | null;
    usd?: string | null;
    usd_foil?: string | null;
  };
  printings?: CardPrintingDetail[];
  rulings?: CardRulingDetail[];
}

export async function getCardDetails(params: {
  id?: string;
  name?: string;
  set?: string;
  collector_number?: string;
}): Promise<SpanishCardDetails | null> {
  const query = new URLSearchParams();
  if (params.id) query.set("id", params.id);
  if (params.name) query.set("name", params.name);
  if (params.set) query.set("set", params.set);
  if (params.collector_number) query.set("collector_number", params.collector_number);

  if (!query.toString()) return null;

  try {
    const data = await backendFetch(`/api/scryfall/card?${query.toString()}`);
    if (data && data.id) {
      return data as SpanishCardDetails;
    }
  } catch (error) {
    console.error("Error fetching Spanish card details from backend:", error);
  }

  // Fallback directly to Scryfall with local Spanish mapping
  try {
    const fallbackUrl = params.id
      ? `https://api.scryfall.com/cards/${params.id}`
      : `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(params.name || "")}`;
    const res = await fetch(fallbackUrl, {
      headers: { "User-Agent": "MTGUtils/2.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const raw = await res.json();
    return {
      id: raw.id,
      name: raw.name,
      name_es: raw.printed_name || raw.name,
      mana_cost: raw.mana_cost,
      cmc: raw.cmc,
      type_line: raw.type_line,
      type_line_es: raw.printed_type_line || raw.type_line,
      oracle_text: raw.oracle_text,
      oracle_text_es: raw.printed_text || raw.oracle_text,
      flavor_text: raw.flavor_text,
      flavor_text_es: raw.flavor_text,
      power: raw.power,
      toughness: raw.toughness,
      loyalty: raw.loyalty,
      defense: raw.defense,
      rarity: raw.rarity,
      rarity_es: raw.rarity || "Común",
      set: (raw.set || "").toUpperCase(),
      set_name: raw.set_name,
      collector_number: raw.collector_number,
      artist: raw.artist,
      has_spanish_print: raw.lang === "es",
      image_uris: raw.image_uris,
      card_faces: [],
      legalities: [],
      prices: raw.prices || {},
    };
  } catch (err) {
    console.error("Direct fallback card resolution failed:", err);
    return null;
  }
}

