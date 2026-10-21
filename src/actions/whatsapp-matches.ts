"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

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

export interface OpportunityDeckImpact {
  deck_card_id: string; deck_id: string; total_cards: number; owned_cards: number;
  quantity: number; assigned_quantity: number; collection_quantity: number;
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
  unit_price?: number | null;
  price_currency?: string;
  price_source?: "link" | "cardmarket" | null;
  trade_quantity?: number;
  trend_unit_price?: number | null;
  completion_gain?: number;
  global_completion_after?: number | null;
  completion_requirements?: OpportunityDeckImpact[];
}

export interface WhatsAppMatchesResponse {
  wants_matches: WhatsAppDealMatch[];
  collection_matches: WhatsAppDealMatch[];
  total_wants_matches: number;
  total_collection_matches: number;
  total_cards_scanned: number;
  last_scraped_at?: string | null;
  global_deck_count?: number;
  global_completion_before?: number;
}

export async function compareOpportunityLink(
  url: string,
  subject: "vende" | "compra_busca",
): Promise<{ data: WhatsAppMatchesResponse } | { error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Inicia sesión para comparar con tus mazos y colección." };
  try {
    const data = await backendFetch<WhatsAppMatchesResponse>("/api/whatsapp/compare-link", {
      method: "POST",
      userId,
      body: JSON.stringify({ url: url.trim(), subject }),
    });
    revalidatePath("/buy/offers");
    return { data };
  } catch (error) {
    // backendFetch includes the JSON error body in its message.
    const message = error instanceof Error ? error.message : "";
    const body = message.slice(message.indexOf(": ") + 2);
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.detail === "string") return { error: parsed.detail };
    } catch { /* Network failures do not contain a JSON body. */ }
    return { error: "No se pudo comparar el enlace. Inténtalo de nuevo." };
  }
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
