/**
 * Pure card string utilities and type categorization safe for both client and server environments.
 * Contains NO server, database, or Prisma dependencies.
 */

import { PriceSummary } from "@/lib/pricing/types";

export function normalizeCardName(name: string): string {
  if (!name) return "";
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  if (cleaned.includes("/")) {
    return cleaned.replace(/\s*\/+\s*/g, " // ").split(" // ")[0];
  }
  return cleaned;
}

export type CardTypeCategory =
  | "commanders"
  | "creatures"
  | "planeswalkers"
  | "instants"
  | "sorceries"
  | "artifacts"
  | "enchantments"
  | "battles"
  | "lands"
  | "other";

export interface CardTypeGroupInfo {
  key: CardTypeCategory;
  label: string;
  order: number;
}

export const CARD_TYPE_GROUPS: Record<CardTypeCategory, CardTypeGroupInfo> = {
  commanders: { key: "commanders", label: "Comandante", order: 0 },
  creatures: { key: "creatures", label: "Criaturas", order: 1 },
  planeswalkers: { key: "planeswalkers", label: "Planeswalkers", order: 2 },
  instants: { key: "instants", label: "Instantáneos", order: 3 },
  sorceries: { key: "sorceries", label: "Conjuros", order: 4 },
  artifacts: { key: "artifacts", label: "Artefactos", order: 5 },
  enchantments: { key: "enchantments", label: "Encantamientos", order: 6 },
  battles: { key: "battles", label: "Batallas", order: 7 },
  lands: { key: "lands", label: "Tierras", order: 8 },
  other: { key: "other", label: "Otras Cartas", order: 9 },
};

const BASIC_LAND_NAMES = new Set([
  // English
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
  // English plurals
  "islands",
  "swamps",
  "mountains",
  "forests",
  // Spanish
  "llanura",
  "isla",
  "pantano",
  "montaña",
  "montana",
  "bosque",
  "yermo",
  "yermos",
  // Spanish plurals
  "llanuras",
  "islas",
  "pantanos",
  "montañas",
  "montanas",
  "bosques",
  // Spanish snow-covered
  "llanura nevada",
  "llanuras nevadas",
  "llanura cubierta de nieve",
  "isla nevada",
  "islas nevadas",
  "isla cubierta de nieve",
  "pantano nevado",
  "pantanos nevados",
  "pantano cubierto de nieve",
  "montaña nevada",
  "montañas nevadas",
  "montana nevada",
  "montanas nevadas",
  "montaña cubierta de nieve",
  "montana cubierta de nieve",
  "bosque nevado",
  "bosques nevados",
  "bosque cubierto de nieve",
  "yermo nevado",
  "yermos nevados",
  "yermo cubierto de nieve",
]);

/**
 * Returns whether a card is one of the generic basic lands (Plains, Island,
 * Swamp, Mountain, Forest, Wastes and their snow-covered forms). Basic lands
 * are excluded from deck completion metrics: they don't count in the
 * numerator (owned) nor the denominator (total).
 */
export function isBasicLand(
  typeLine?: string | null,
  cardName?: string | null
): boolean {
  if (typeLine) {
    const lower = typeLine.toLowerCase();
    if (
      lower.includes("basic land") ||
      lower.includes("tierra básica") ||
      lower.includes("tierra basica") ||
      (lower.includes("basic") && lower.includes("land")) ||
      (lower.includes("básica") && lower.includes("tierra")) ||
      (lower.includes("basica") && lower.includes("tierra"))
    ) {
      return true;
    }
  }
  if (cardName) {
    const norm = normalizeCardName(cardName);
    if (BASIC_LAND_NAMES.has(norm)) return true;
    for (const b of Array.from(BASIC_LAND_NAMES)) {
      if (norm === b || norm.startsWith(`${b} `) || norm.endsWith(` ${b}`)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Categorizes an MTG card based on its type_line, with intelligent fallback
 * heuristics based on card name for basic and common lands when type_line is missing.
 * Follows MTG convention where creature types take precedence (e.g. Artifact Creatures -> Criaturas).
 */
export function getCardCategory(
  typeLine?: string | null,
  cardName?: string | null
): CardTypeCategory {
  if (typeLine) {
    const lower = typeLine.toLowerCase();

    // Creature takes precedence for Artifact Creatures / Enchantment Creatures
    if (lower.includes("creature") || lower.includes("criatura")) return "creatures";
    if (lower.includes("planeswalker")) return "planeswalkers";
    if (lower.includes("instant") || lower.includes("instantáneo")) return "instants";
    if (lower.includes("sorcery") || lower.includes("conjuro")) return "sorceries";
    if (lower.includes("artifact") || lower.includes("artefacto")) return "artifacts";
    if (lower.includes("enchantment") || lower.includes("encantamiento")) return "enchantments";
    if (lower.includes("battle") || lower.includes("batalla")) return "battles";
    if (lower.includes("land") || lower.includes("tierra")) return "lands";
  }

  // Intelligent fallback heuristics based on cardName when typeLine is not yet populated
  if (cardName) {
    const lowerName = cardName.toLowerCase().trim();

    // Basic lands
    if (isBasicLand(typeLine, cardName)) {
      return "lands";
    }

    // Ubiquitous MTG lands
    if (
      lowerName.includes("command tower") ||
      lowerName.includes("reliquary tower") ||
      lowerName.includes("boilerworks") ||
      lowerName.includes("sanctuary") ||
      lowerName.includes("headquarters") ||
      lowerName.includes("cliffs") ||
      lowerName.includes("evolving wilds") ||
      lowerName.includes("terramorphic expanse") ||
      lowerName.includes("fabled passage") ||
      lowerName.includes("prismatic vista") ||
      lowerName.includes("city of brass") ||
      lowerName.includes("mana confluence") ||
      lowerName.includes("reflecting pool") ||
      lowerName.includes("path of ancestry") ||
      lowerName.includes("exotic orchard")
    ) {
      return "lands";
    }
  }

  return "other";
}

export interface GroupedCardSection<T> {
  key: CardTypeCategory;
  label: string;
  order: number;
  cards: T[];
  totalCards: number;
  totalCardsCount: number;
  completionTotalCards: number;
  uniqueCards: number;
  ownedCards: number;
  missingCards: number;
  completionPercentage: number;
  sectionTotalPrice: number;
  unpricedCards: number;
  sectionMissingPrice: number;
  sectionOwnedPrice: number;
  currencySymbol: string;
}

export interface GroupCardsOptions {
  /**
   * When true, basic lands are excluded from the section's completion stats
   * (completionTotalCards, ownedCards, missingCards, completionPercentage). They are
   * still included in totalCardsCount, cards list and in the price totals.
   */
  excludeBasicLands?: boolean;
}

/**
 * Groups an array of deck cards by card type and computes section-level stats:
 * total card count, owned count, completion %, and section net market price.
 */
export function groupCardsByType<
  T extends {
    cardName: string;
    cardScryfallId?: string;
    typeLine?: string | null;
    quantity: number;
    ownedInCollection?: number;
    missingCount?: number;
    edhrecCategory?: CardTypeCategory;
  }
>(cards: T[], priceSummary?: PriceSummary | null, options?: GroupCardsOptions): GroupedCardSection<T>[] {
  const excludeBasicLands = options?.excludeBasicLands ?? false;
  const buckets = new Map<CardTypeCategory, T[]>();

  for (const card of cards) {
    const cat = card.edhrecCategory ?? getCardCategory(card.typeLine, card.cardName);
    const list = buckets.get(cat) || [];
    list.push(card);
    buckets.set(cat, list);
  }

  const sections: GroupedCardSection<T>[] = [];
  const currencySymbol = priceSummary?.currencySymbol || "€";

  for (const [catKey, groupInfo] of Object.entries(CARD_TYPE_GROUPS)) {
    const cat = catKey as CardTypeCategory;
    const catCards = buckets.get(cat);
    if (!catCards || catCards.length === 0) continue;

    let completionTotalCards = 0;
    let totalCardsCount = 0;
    let ownedCards = 0;
    let missingCards = 0;
    let sectionTotalPrice = 0;
    let unpricedCards = 0;
    let sectionMissingPrice = 0;

    for (const card of catCards) {
      const isBasic = isBasicLand(card.typeLine, card.cardName);
      const owned = card.ownedInCollection ?? 0;
      // Basic lands are always 100% owned without needing to be in the collection or moved to deck
      const effectiveOwned = isBasic ? card.quantity : Math.min(owned, card.quantity);
      const missing = isBasic ? 0 : (card.missingCount ?? Math.max(0, card.quantity - owned));

      totalCardsCount += card.quantity;

      if (excludeBasicLands && isBasic) {
        // Excluded from completion numerator and denominator only if explicitly requested
      } else {
        completionTotalCards += card.quantity;
        ownedCards += effectiveOwned;
        missingCards += missing;
      }

      // Price calculation
      const norm = normalizeCardName(card.cardName);
      const quote =
        (card.cardScryfallId ? priceSummary?.quotes[card.cardScryfallId] : undefined) ||
        priceSummary?.quotes[norm];

      if (quote?.unitPrice?.trend == null) unpricedCards += card.quantity;
      const trend = quote?.unitPrice?.trend ?? 0;
      sectionTotalPrice += trend * card.quantity;
      sectionMissingPrice += trend * missing;
    }

    // A section made only of basic lands has nothing left to complete.
    const completionPercentage =
      completionTotalCards > 0 ? Math.round((ownedCards / completionTotalCards) * 1000) / 10 : 100;

    const totalP = Math.round(sectionTotalPrice * 100) / 100;
    const missP = Math.round(sectionMissingPrice * 100) / 100;
    const ownedP = Math.round((totalP - missP) * 100) / 100;

    sections.push({
      key: cat,
      label: groupInfo.label,
      order: groupInfo.order,
      cards: catCards,
      totalCards: completionTotalCards,
      totalCardsCount,
      completionTotalCards,
      uniqueCards: catCards.length,
      ownedCards,
      missingCards,
      completionPercentage,
      sectionTotalPrice: totalP,
      unpricedCards,
      sectionMissingPrice: missP,
      sectionOwnedPrice: ownedP,
      currencySymbol,
    });
  }

  return sections.sort((a, b) => a.order - b.order);
}

export interface PartnerInfo {
  hasPartner: boolean;
  specificPartner: string | null;
  partnerType?: "specific" | "generic" | "friends_forever" | "doctors_companion";
}

/**
 * Parses oracle text (and optional all_parts / keywords) to identify whether
 * a card has the Partner mechanic, and if it specifies a partner by name
 * (e.g. "Partner with Okaun, Eye of Chaos" on Zndrsplt).
 */
export function getPartnerInfo(
  oracleText?: string | null,
  allParts?: Array<{ name: string; component?: string }>
): PartnerInfo {
  if (!oracleText && (!allParts || allParts.length === 0)) {
    return { hasPartner: false, specificPartner: null };
  }

  const text = oracleText || "";

  // 1. Check for specific partner: "Partner with <Card Name>"
  // Handles:
  // "Partner with Okaun, Eye of Chaos (When this creature enters..."
  // "Partner with Okaun, Eye of Chaos\n..."
  const specificMatch = text.match(/partner with\s+([^(\n\r]+?)(?:\s*\(|$)/i);
  if (specificMatch && specificMatch[1]?.trim()) {
    return {
      hasPartner: true,
      specificPartner: specificMatch[1].trim(),
      partnerType: "specific",
    };
  }

  // Fallback: check all_parts for combo_piece or partner if not found by regex
  if (allParts && allParts.length > 0) {
    const relatedPartner = allParts.find(
      (part) =>
        (part.component === "combo_piece" || part.component === "partner") &&
        text.toLowerCase().includes("partner with")
    );
    if (relatedPartner?.name) {
      return {
        hasPartner: true,
        specificPartner: relatedPartner.name.trim(),
        partnerType: "specific",
      };
    }
  }

  const lower = text.toLowerCase();
  if (lower.includes("partner with")) {
    const after = text.split(/partner with\s+/i)[1];
    if (after) {
      const namePart = after.split(/[\n\r(]/)[0]?.trim();
      if (namePart) {
        return {
          hasPartner: true,
          specificPartner: namePart,
          partnerType: "specific",
        };
      }
    }
  }

  if (lower.includes("friends forever")) {
    return { hasPartner: true, specificPartner: null, partnerType: "friends_forever" };
  }

  if (lower.includes("doctor's companion")) {
    return { hasPartner: true, specificPartner: null, partnerType: "doctors_companion" };
  }

  if (lower.includes("partner")) {
    return { hasPartner: true, specificPartner: null, partnerType: "generic" };
  }

  return { hasPartner: false, specificPartner: null };
}
