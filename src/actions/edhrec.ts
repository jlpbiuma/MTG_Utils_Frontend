"use server";

import { getCurrentUserId } from "./auth";
import { backendFetch } from "@/lib/api-client";
import { EdhrecCardRecommendation } from "@/lib/schemas";

export interface DeckRecommendationsResult {
  error?: string;
  commander?: {
    name: string;
    imageUri?: string | null;
    numDecks: number;
    colorIdentity?: string[];
  };
  categories?: string[];
  recommendations: EdhrecCardRecommendation[];
}

/**
 * Fetches community card recommendations for a deck's commander from the FastAPI backend.
 */
export async function getDeckRecommendations(
  deckId: string
): Promise<DeckRecommendationsResult> {
  try {
    const userId = await getCurrentUserId();
    return await backendFetch<DeckRecommendationsResult>(
      `/api/edhrec/recommendations?deckId=${deckId}`,
      { userId }
    );
  } catch (error) {
    console.error("Error fetching recommendations from backend:", error);
    return {
      error: "No se pudieron cargar las recomendaciones de EDHREC.",
      recommendations: [],
    };
  }
}
