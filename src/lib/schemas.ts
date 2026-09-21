import { z } from "zod";
import { Currency } from "@/lib/pricing/types";

export const DeckCreateSchema = z.object({
  name: z.string().min(1, "El nombre del mazo es obligatorio").max(100),
  format: z.string().default("Commander"),
  description: z.string().nullable().optional(),
  commander: z.string().nullable().optional(),
  commanderScryfallId: z.string().nullable().optional(),
  commanderImageUri: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const DeckUpdateSchema = z.object({
  name: z.string().min(1, "El nombre del mazo no puede estar vacío").max(100).optional(),
  format: z.string().optional(),
  description: z.string().nullable().optional(),
  commander: z.string().nullable().optional(),
  commanderScryfallId: z.string().nullable().optional(),
  commanderImageUri: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export const DeckCardCreateSchema = z.object({
  cardScryfallId: z.string().min(1),
  cardName: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  isSideboard: z.boolean().default(false),
  isCommander: z.boolean().optional().default(false),
  manaCost: z.string().nullable().optional(),
  typeLine: z.string().nullable().optional(),
  imageUri: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const CollectionCardCreateSchema = z.object({
  isFoil: z.boolean().default(false),
  cardScryfallId: z.string().min(1),
  cardName: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  setCode: z.string().nullable().optional(),
  collectorNumber: z.string().nullable().optional(),
  manaCost: z.string().nullable().optional(),
  typeLine: z.string().nullable().optional(),
  imageUri: z.string().nullable().optional(),
});

export type DeckCreateInput = z.input<typeof DeckCreateSchema>;
export type DeckUpdateInput = z.input<typeof DeckUpdateSchema>;
export type DeckCardCreateInput = z.input<typeof DeckCardCreateSchema>;
export type CollectionCardCreateInput = z.input<typeof CollectionCardCreateSchema>;

export interface DeckWithCompletion {
  id: string;
  userId: string;
  name: string;
  format: string;
  description: string | null;
  commander: string | null;
  commanderScryfallId: string | null;
  commanderImageUri: string | null;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalCards: number;
  uniqueCards: number;
  ownedCards: number;
  missingCardsCount: number;
  completionPercentage: number;
  colors?: string[];
  colorIdentity?: string;
  totalValue?: number | null;
  missingValue?: number | null;
  ownedValue?: number | null;
  currency?: Currency;
  currencySymbol?: string;
  tags?: string[];
}

export type DeckSummary = DeckWithCompletion;


export interface OtherDeckAssignment {
  deckId: string;
  deckName: string;
  quantity: number;
}

export interface DeckRequirement {
  deckId: string;
  deckName: string;
  quantity: number;
  completionPercentage?: number;
  colors?: string[];
}

export interface DeckCardWithOwnership {
  id: string;
  deckId: string;
  cardScryfallId: string;
  cardName: string;
  quantity: number;
  assignedQuantity: number;
  isSideboard: boolean;
  isCommander?: boolean;
  manaCost: string | null;
  typeLine: string | null;
  imageUri: string | null;
  ownedInCollection: number;
  availableToAssign: number;
  assignedInOtherDecks: OtherDeckAssignment[];
  requestedInDecks?: DeckRequirement[];
  requestedInDecksCount?: number;
  missingCount: number;
  canBeCommander?: boolean;
  setCode?: string | null;
  tags?: string[];
}

export interface DeckDetailWithStats extends DeckWithCompletion {
  cards: DeckCardWithOwnership[];
}

export interface EdhrecCardRecommendation {
  id: string; // Scryfall UUID
  name: string;
  normalizedName: string;
  sanitized: string;
  category: string; // e.g. "High Synergy Cards", "Top Cards", "Creatures", "Instants", etc.
  categories: string[];
  numDecks: number;
  potentialDecks: number;
  inclusionPct: number; // e.g. 91.4%
  synergy: number; // e.g. +37.8%
  imageUri: string | null;
  isInDeck: boolean;
  isInCollection: boolean;
  collectionQuantity: number;
  requestedInDecks?: DeckRequirement[];
  requestedInDecksCount?: number;
  isInWant?: boolean;
}

