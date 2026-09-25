"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";

export interface CatalogCardSummary {
  card_id?: string | null;
  name: string;
  image_uri?: string | null;
  type_line?: string | null;
  mana_cost?: string | null;
  cmc?: number | null;
  rarity?: string | null;
  price_cardmarket?: number | null;
}

export interface WantMatchInfo {
  want_id: string;
  quantity_wanted: number;
  requested_decks: string[];
}

export interface CollectionMatchInfo {
  collection_id: string;
  quantity_owned: number;
  available_quantity: number;
}

export interface WhatsAppDealMatch {
  id: number;
  card_name: string;
  normalized_name: string;
  set_code?: string | null;
  price?: string | null;
  currency?: string | null;
  condition?: string | null;
  subject: "vende" | "compra_busca";
  whatsapp_url: string;
  source_phone: string;
  source_chat?: string | null;
  raw_message?: string | null;
  detected_at?: string | null;
  direct_whatsapp_link: string;
  extra: Record<string, unknown>;
  catalog_card?: CatalogCardSummary | null;
  matched_want?: WantMatchInfo | null;
  matched_collection?: CollectionMatchInfo | null;
}

export interface WhatsAppMatchesResponse {
  wants_matches: WhatsAppDealMatch[];
  collection_matches: WhatsAppDealMatch[];
  total_wants_matches: number;
  total_collection_matches: number;
  total_cards_scanned: number;
  last_scraped_at?: string | null;
}

export async function getWhatsAppMatches(): Promise<WhatsAppMatchesResponse> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      wants_matches: [],
      collection_matches: [],
      total_wants_matches: 0,
      total_collection_matches: 0,
      total_cards_scanned: 0,
    };
  }

  try {
    return await backendFetch<WhatsAppMatchesResponse>("/api/whatsapp/matches", {
      userId,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Error fetching WhatsApp matches:", error);
    return {
      wants_matches: [],
      collection_matches: [],
      total_wants_matches: 0,
      total_collection_matches: 0,
      total_cards_scanned: 0,
    };
  }
}
