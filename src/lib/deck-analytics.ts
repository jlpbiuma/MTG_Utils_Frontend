import type { DeckCardWithOwnership } from "@/lib/schemas";
import { getCardCategory, isBasicLand } from "@/lib/card-utils";

export interface ManaCurveBucket {
  cmc: string; // "0", "1", "2", "3", "4", "5", "6", "7+"
  numericCmc: number;
  // Breakdown by card type
  creatures: number;
  instants: number;
  sorceries: number;
  artifacts: number;
  enchantments: number;
  planeswalkers: number;
  lands: number;
  other: number;
  // Breakdown by color
  white: number;
  blue: number;
  black: number;
  red: number;
  green: number;
  multi: number;
  colorless: number;
  total: number;
}

export interface ManaCurveOptions {
  excludeLands?: boolean;
  excludeCommander?: boolean;
}

export interface ManaCurveAnalysis {
  curve: ManaCurveBucket[];
  avgCmc: number;
  avgCmcWithLands: number;
  avgCmcWithoutLands: number;
  totalLands: number;
  totalNonLands: number;
  maxCount: number;
}

export interface ColorPips {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
}

export interface ColorDistributionItem {
  color: "W" | "U" | "B" | "R" | "G" | "C";
  name: string;
  pips: number;
  pipPercentage: number;
  sources: number;
  sourcePercentage: number;
  imbalance: number; // positive = needs more sources, negative = has surplus sources
  fillColor: string;
}

export interface TypeDistributionItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface KarstenColorRecommendation {
  color: "W" | "U" | "B" | "R" | "G";
  colorName: string;
  sourcesOwned: number;
  sourcesRecommended: number;
  status: "optimal" | "warning" | "danger";
  toughestCost: string;
}

export function parseManaValue(manaCost?: string | null): number {
  if (!manaCost) return 0;
  const matches = manaCost.match(/\{([^}]+)\}/g);
  if (!matches) return 0;

  let cmc = 0;
  for (const m of matches) {
    const symbol = m.replace(/[{}]/g, "").toUpperCase();
    const num = parseInt(symbol, 10);
    if (!isNaN(num)) {
      cmc += num;
    } else if (symbol === "X" || symbol === "Y" || symbol === "Z") {
      cmc += 0;
    } else {
      // Split / Phyrexian / Hybrid like W/U or 2/W or G/P count as 1
      cmc += 1;
    }
  }
  return cmc;
}

export function getCardColorsFromManaCost(manaCost?: string | null): string[] {
  if (!manaCost) return [];
  const colors = new Set<string>();
  const matches = manaCost.match(/\{([^}]+)\}/g) || [];
  for (const m of matches) {
    const sym = m.replace(/[{}]/g, "").toUpperCase();
    if (sym.includes("W")) colors.add("W");
    if (sym.includes("U")) colors.add("U");
    if (sym.includes("B")) colors.add("B");
    if (sym.includes("R")) colors.add("R");
    if (sym.includes("G")) colors.add("G");
  }
  return Array.from(colors);
}

export function getCardColorBucket(manaCost?: string | null): "white" | "blue" | "black" | "red" | "green" | "multi" | "colorless" {
  const colors = getCardColorsFromManaCost(manaCost);
  if (colors.length === 0) return "colorless";
  if (colors.length > 1) return "multi";
  switch (colors[0]) {
    case "W": return "white";
    case "U": return "blue";
    case "B": return "black";
    case "R": return "red";
    case "G": return "green";
    default: return "colorless";
  }
}

export function analyzeManaCurve(
  cards: DeckCardWithOwnership[],
  options: ManaCurveOptions = { excludeLands: true, excludeCommander: false }
): ManaCurveAnalysis {
  const buckets: Record<number, ManaCurveBucket> = {
    0: { cmc: "0", numericCmc: 0, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    1: { cmc: "1", numericCmc: 1, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    2: { cmc: "2", numericCmc: 2, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    3: { cmc: "3", numericCmc: 3, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    4: { cmc: "4", numericCmc: 4, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    5: { cmc: "5", numericCmc: 5, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    6: { cmc: "6", numericCmc: 6, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
    7: { cmc: "7+", numericCmc: 7, creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0, other: 0, white: 0, blue: 0, black: 0, red: 0, green: 0, multi: 0, colorless: 0, total: 0 },
  };

  let totalLands = 0;
  let totalNonLands = 0;
  let sumCmcNonLands = 0;
  let sumCmcActive = 0;
  let countActive = 0;

  for (const card of cards) {
    if (card.isSideboard) continue;
    const cat = getCardCategory(card.typeLine, card.cardName);
    const isLand = cat === "lands" || isBasicLand(card.typeLine, card.cardName);
    const qty = card.quantity || 1;

    if (isLand) {
      totalLands += qty;
    } else {
      totalNonLands += qty;
      const cmc = parseManaValue(card.manaCost);
      sumCmcNonLands += cmc * qty;
    }

    // Check exclusion filters for the chart display
    if (options.excludeLands && isLand) continue;
    if (options.excludeCommander && card.isCommander) continue;

    const cmc = parseManaValue(card.manaCost);
    sumCmcActive += cmc * qty;
    countActive += qty;

    const binIndex = Math.min(7, Math.max(0, cmc));
    const b = buckets[binIndex];
    b.total += qty;

    // Categorize by card type
    switch (cat) {
      case "creatures":
        b.creatures += qty;
        break;
      case "instants":
        b.instants += qty;
        break;
      case "sorceries":
        b.sorceries += qty;
        break;
      case "artifacts":
        b.artifacts += qty;
        break;
      case "enchantments":
        b.enchantments += qty;
        break;
      case "planeswalkers":
        b.planeswalkers += qty;
        break;
      case "lands":
        b.lands += qty;
        break;
      default:
        b.other += qty;
        break;
    }

    // Categorize by color identity / color bucket
    const colorKey = getCardColorBucket(card.manaCost);
    b[colorKey] += qty;
  }

  const curve = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => buckets[i]);
  const maxCount = Math.max(1, ...curve.map((b) => b.total));
  const totalDeckCards = totalLands + totalNonLands;

  return {
    curve,
    avgCmc: countActive > 0 ? Math.round((sumCmcActive / countActive) * 100) / 100 : 0,
    avgCmcWithLands: totalDeckCards > 0 ? Math.round((sumCmcNonLands / totalDeckCards) * 100) / 100 : 0,
    avgCmcWithoutLands: totalNonLands > 0 ? Math.round((sumCmcNonLands / totalNonLands) * 100) / 100 : 0,
    totalLands,
    totalNonLands,
    maxCount,
  };
}

export function analyzeTypeDistribution(cards: DeckCardWithOwnership[]): TypeDistributionItem[] {
  const counts: Record<string, number> = {
    creatures: 0,
    instants: 0,
    sorceries: 0,
    artifacts: 0,
    enchantments: 0,
    planeswalkers: 0,
    lands: 0,
    other: 0,
  };

  let total = 0;
  for (const card of cards) {
    if (card.isSideboard) continue;
    const cat = getCardCategory(card.typeLine, card.cardName);
    const qty = card.quantity || 1;
    counts[cat] = (counts[cat] || 0) + qty;
    total += qty;
  }

  const items: { key: string; label: string; color: string }[] = [
    { key: "creatures", label: "Criaturas", color: "#10b981" },
    { key: "instants", label: "Instantáneos", color: "#3b82f6" },
    { key: "sorceries", label: "Conjuros", color: "#f59e0b" },
    { key: "artifacts", label: "Artefactos", color: "#6366f1" },
    { key: "enchantments", label: "Encantamientos", color: "#ec4899" },
    { key: "planeswalkers", label: "Planeswalkers", color: "#8b5cf6" },
    { key: "lands", label: "Tierras", color: "#84cc16" },
    { key: "other", label: "Otros", color: "#71717a" },
  ];

  return items
    .map((item) => {
      const count = counts[item.key] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        key: item.key,
        label: item.label,
        count,
        percentage,
        color: item.color,
      };
    })
    .filter((item) => item.count > 0);
}

export function isTapland(cardName: string, typeLine?: string | null): boolean {
  if (!cardName) return false;
  const name = cardName.trim().toLowerCase();
  const type = (typeLine || "").toLowerCase();

  // Basic lands are never taplands
  if (isBasicLand(typeLine, cardName)) return false;

  // Must be a land
  if (!type.includes("land") && !getCardCategory(typeLine, cardName).includes("lands")) return false;

  // Gates
  if (name.includes("guildgate") || name.endsWith(" gate") || name.includes(" gate ")) return true;
  // Temples / Scrylands
  if (name.startsWith("temple of ") && !name.includes("temple of the false god")) return true;
  // Bounce / Karoo
  if (
    name.includes("chancery") ||
    name.includes("aqueduct") ||
    name.includes("carnarium") ||
    name.includes("turf") ||
    name.includes("sanctuary") ||
    name.includes("basilica") ||
    name.includes("boilerworks") ||
    name.includes("rot farm") ||
    name.includes("garrison") ||
    name.includes("growth chamber") ||
    name.includes("guildless commons") ||
    name === "karoo" ||
    name === "everglades" ||
    name === "dormant volcano" ||
    name === "jungle basin" ||
    name === "coral atoll"
  ) {
    return true;
  }
  // Triomes & Tri-lands
  if (
    name.includes("triome") ||
    name.includes("raffine's tower") ||
    name.endsWith(" hq") ||
    name.endsWith(" lounge") ||
    name.endsWith(" proving ground") ||
    name.endsWith(" garden") ||
    name.includes("citadel") ||
    (name.includes("sanctum") && !name.includes("serra's sanctum")) ||
    name.includes("necropolis") ||
    name.includes("savage lands") ||
    name.includes("jungle shrine") ||
    name.includes("nomad outpost") ||
    name.includes("frontier bivouac") ||
    name.includes("mystic monastery") ||
    name.includes("sandsteppe citadel") ||
    name.includes("opulent palace")
  ) {
    return true;
  }
  // Artifact bridges
  if (name.endsWith(" bridge") && type.includes("artifact")) return true;
  // Thriving & Vivid lands
  if (name.startsWith("thriving ") || name.startsWith("vivid ")) return true;
  // Campus lands
  if (name.endsWith(" campus")) return true;
  // Gainlands, Refuges & Common tapped duals
  if (
    name.includes("refuge") ||
    name.includes("cove") ||
    name.includes("backwater") ||
    (name.includes("caves") && !name.includes("caves of koilos")) ||
    name.includes("highlands") ||
    name.includes("sands") ||
    (name.includes("barrens") && !name.includes("ash barrens")) ||
    (name.includes("cliffs") && !name.includes("blackcleave cliffs")) ||
    (name.includes("hollow") && !name.includes("darkslick shores")) ||
    (name.includes("crag") && !name.includes("rootbound crag")) ||
    (name.includes("falls") && !name.includes("sulfur falls")) ||
    (name.includes("orchard") && !name.includes("exotic orchard") && !name.includes("forbidden orchard")) ||
    name.includes("path of ancestry") ||
    name.includes("myriad landscape") ||
    name.includes("evolving wilds") ||
    name.includes("terramorphic expanse")
  ) {
    return true;
  }

  return false;
}

export interface TaplandAnalysis {
  count: number;
  percentage: number;
  tempoDrag: number;
  openingHandProb: number;
}

export function extractPipsAndSources(
  cards: DeckCardWithOwnership[],
  deckColors?: string[] | null
) {
  const pips: ColorPips = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const sources: ColorPips = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

  const rawColors = Array.isArray(deckColors)
    ? deckColors
    : typeof deckColors === "string"
    ? (deckColors as string).split("").filter((c) => ["W", "U", "B", "R", "G", "C"].includes(c.toUpperCase()))
    : [];
  const validDeckColors =
    rawColors.length > 0 ? new Set(rawColors.map((c) => c.toUpperCase())) : null;

  for (const card of cards) {
    if (card.isSideboard) continue;
    const qty = card.quantity || 1;
    const cat = getCardCategory(card.typeLine, card.cardName);

    // Extract casting cost pips
    if (card.manaCost) {
      const symbols = card.manaCost.match(/\{([^}]+)\}/g) || [];
      for (const s of symbols) {
        const sym = s.replace(/[{}]/g, "").toUpperCase();
        if (sym.includes("W")) pips.W += qty;
        if (sym.includes("U")) pips.U += qty;
        if (sym.includes("B")) pips.B += qty;
        if (sym.includes("R")) pips.R += qty;
        if (sym.includes("G")) pips.G += qty;
        if (sym.includes("C")) pips.C += qty;
      }
    }

    // Extract mana production sources from lands / mana rocks
    const nameLower = card.cardName.toLowerCase();
    const typeLower = (card.typeLine || "").toLowerCase();

    const isManaProducer =
      cat === "lands" ||
      isBasicLand(card.typeLine, card.cardName) ||
      cat === "artifacts" ||
      nameLower.includes("sol ring") ||
      nameLower.includes("arcane signet") ||
      nameLower.includes("command tower");

    if (isManaProducer) {
      // Basic lands & land types
      if (typeLower.includes("plains") || nameLower.includes("plains")) sources.W += qty;
      if (typeLower.includes("island") || nameLower.includes("island")) sources.U += qty;
      if (typeLower.includes("swamp") || nameLower.includes("swamp")) sources.B += qty;
      if (typeLower.includes("mountain") || nameLower.includes("mountain")) sources.R += qty;
      if (typeLower.includes("forest") || nameLower.includes("forest")) sources.G += qty;
      if (typeLower.includes("wastes") || nameLower.includes("wastes") || nameLower.includes("sol ring")) sources.C += qty;

      // 5-color staples: if deckColors are provided, only add sources for colors the deck actually plays
      if (
        nameLower.includes("command tower") ||
        nameLower.includes("arcane signet") ||
        nameLower.includes("exotic orchard") ||
        nameLower.includes("fellwar stone") ||
        nameLower.includes("city of brass") ||
        nameLower.includes("mana confluence") ||
        nameLower.includes("reflecting pool")
      ) {
        if (validDeckColors) {
          if (validDeckColors.has("W")) sources.W += qty;
          if (validDeckColors.has("U")) sources.U += qty;
          if (validDeckColors.has("B")) sources.B += qty;
          if (validDeckColors.has("R")) sources.R += qty;
          if (validDeckColors.has("G")) sources.G += qty;
        } else {
          sources.W += qty;
          sources.U += qty;
          sources.B += qty;
          sources.R += qty;
          sources.G += qty;
        }
      }
    }
  }

  return { pips, sources };
}

export function analyzeManaBaseAndColors(
  cards: DeckCardWithOwnership[],
  avgCmcWithoutLands: number,
  deckColors?: string[] | null
): {
  totalLands: number;
  recommendedLands: number;
  colorComparison: ColorDistributionItem[];
  karstenRecs: KarstenColorRecommendation[];
  taplands: TaplandAnalysis;
} {
  const { pips, sources } = extractPipsAndSources(cards, deckColors);
  let totalLands = 0;
  let taplandsCount = 0;
  let totalDeckCards = 0;

  for (const c of cards) {
    if (c.isSideboard) continue;
    const qty = c.quantity || 1;
    totalDeckCards += qty;
    const isLand = getCardCategory(c.typeLine, c.cardName) === "lands" || isBasicLand(c.typeLine, c.cardName);
    if (isLand) {
      totalLands += qty;
      if (isTapland(c.cardName, c.typeLine)) {
        taplandsCount += qty;
      }
    }
  }

  // Commander recommended lands rule: baseline 31 + round(avgCmc * 1.75)
  const recommendedLands = Math.max(30, Math.min(42, 31 + Math.round(avgCmcWithoutLands * 1.75)));

  const validDeckColors =
    deckColors && deckColors.length > 0
      ? new Set(deckColors.map((c) => c.toUpperCase()))
      : null;

  const totalPips = pips.W + pips.U + pips.B + pips.R + pips.G;
  const totalSources = sources.W + sources.U + sources.B + sources.R + sources.G;

  const colorMeta: { color: "W" | "U" | "B" | "R" | "G"; name: string; fillColor: string }[] = [
    { color: "W", name: "Blanco", fillColor: "#fef08a" },
    { color: "U", name: "Azul", fillColor: "#38bdf8" },
    { color: "B", name: "Negro", fillColor: "#a855f7" },
    { color: "R", name: "Rojo", fillColor: "#f87171" },
    { color: "G", name: "Verde", fillColor: "#4ade80" },
  ];

  const colorComparison: ColorDistributionItem[] = colorMeta
    .filter((m) => {
      if (validDeckColors) {
        return validDeckColors.has(m.color) || pips[m.color] > 0;
      }
      return pips[m.color] > 0 || sources[m.color] > 0;
    })
    .map((m) => {
      const pipPct = totalPips > 0 ? Math.round((pips[m.color] / totalPips) * 1000) / 10 : 0;
      const srcPct = totalSources > 0 ? Math.round((sources[m.color] / totalSources) * 1000) / 10 : 0;
      const imbalance = Math.round((pipPct - srcPct) * 10) / 10;
      return {
        color: m.color,
        name: m.name,
        pips: pips[m.color],
        pipPercentage: pipPct,
        sources: sources[m.color],
        sourcePercentage: srcPct,
        imbalance,
        fillColor: m.fillColor,
      };
    });

  const karstenRecs = calculateKarstenRecommendations(cards, sources, deckColors);

  const taplandsPercentage =
    totalLands > 0 ? Math.round((taplandsCount / totalLands) * 1000) / 10 : 0;
  const tempoDrag =
    totalLands > 0 ? Math.round((taplandsCount / totalLands) * 0.85 * 10) / 10 : 0;
  const openingHandTaplandProb =
    totalDeckCards > 0 && taplandsCount > 0
      ? calculateHypergeometric(totalDeckCards, taplandsCount, 7, 1).atLeast
      : 0;

  return {
    totalLands,
    recommendedLands,
    colorComparison,
    karstenRecs,
    taplands: {
      count: taplandsCount,
      percentage: taplandsPercentage,
      tempoDrag,
      openingHandProb: openingHandTaplandProb,
    },
  };
}

export function calculateKarstenRecommendations(
  cards: DeckCardWithOwnership[],
  sources: ColorPips,
  deckColors?: string[] | null
): KarstenColorRecommendation[] {
  const colorNames: Record<"W" | "U" | "B" | "R" | "G", string> = {
    W: "Blanco",
    U: "Azul",
    B: "Negro",
    R: "Rojo",
    G: "Verde",
  };

  const rawColors = Array.isArray(deckColors)
    ? deckColors
    : typeof deckColors === "string"
    ? (deckColors as string).split("").filter((c) => ["W", "U", "B", "R", "G", "C"].includes(c.toUpperCase()))
    : [];
  const validDeckColors =
    rawColors.length > 0 ? new Set(rawColors.map((c) => c.toUpperCase())) : null;

  const colors: ("W" | "U" | "B" | "R" | "G")[] = ["W", "U", "B", "R", "G"];
  const recommendations: KarstenColorRecommendation[] = [];

  for (const c of colors) {
    let maxPipsInCard = 0;
    let toughestCost = "";

    for (const card of cards) {
      if (!card.manaCost) continue;
      const symbols = card.manaCost.match(/\{([^}]+)\}/g) || [];
      const count = symbols.filter((s) => s.replace(/[{}]/g, "").toUpperCase().includes(c)).length;
      if (count > maxPipsInCard) {
        maxPipsInCard = count;
        toughestCost = card.manaCost;
      }
    }

    if (maxPipsInCard === 0) {
      // If no pips in deck, skip this color unless it's in deckColors and has sources
      if (!validDeckColors || !validDeckColors.has(c)) continue;
    }

    let recommended = 20;
    if (maxPipsInCard === 2) recommended = 26;
    if (maxPipsInCard >= 3) recommended = 32;

    const owned = sources[c];
    let status: "optimal" | "warning" | "danger" = "optimal";
    if (owned < recommended - 4) {
      status = "danger";
    } else if (owned < recommended) {
      status = "warning";
    }

    recommendations.push({
      color: c,
      colorName: colorNames[c],
      sourcesOwned: owned,
      sourcesRecommended: recommended,
      status,
      toughestCost,
    });
  }

  return recommendations;
}

/**
 * Calculates combinations C(n, k)
 */
function combinations(n: number, k: number): number {
  if (k < 0 || k > n || !isFinite(n) || !isFinite(k)) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const minK = Math.min(k, n - k);
  for (let i = 1; i <= minK; i++) {
    c = (c * (n - (minK - i))) / i;
    if (!isFinite(c)) return 0;
  }
  return isFinite(c) ? c : 0;
}

/**
 * Hypergeometric probability calculation:
 * N: Population size (e.g. 99 in Commander)
 * K: Successes in population (e.g. 36 lands)
 * n: Sample size (e.g. 7 opening hand)
 * k: Desired successes
 */
export function calculateHypergeometric(
  N: number,
  K: number,
  n: number,
  k: number
): { exact: number; atLeast: number; atMost: number } {
  if (
    !isFinite(N) || !isFinite(K) || !isFinite(n) || !isFinite(k) ||
    N <= 0 || K < 0 || n <= 0 || k < 0 || K > N || n > N
  ) {
    return { exact: 0, atLeast: 0, atMost: 0 };
  }

  const totalPossible = combinations(N, n);
  if (!totalPossible || totalPossible <= 0 || !isFinite(totalPossible)) {
    return { exact: 0, atLeast: 0, atMost: 0 };
  }

  const pmf = (x: number) => {
    if (x < 0 || x > K || n - x < 0 || n - x > N - K) return 0;
    const ways = combinations(K, x) * combinations(N - K, n - x);
    if (!isFinite(ways)) return 0;
    return ways / totalPossible;
  };

  const exact = pmf(k);

  let atLeast = 0;
  for (let x = k; x <= Math.min(n, K); x++) {
    atLeast += pmf(x);
  }

  let atMost = 0;
  for (let x = 0; x <= Math.min(n, k); x++) {
    atMost += pmf(x);
  }

  return {
    exact: isNaN(exact) || !isFinite(exact) ? 0 : Math.round(exact * 1000) / 10,
    atLeast: isNaN(atLeast) || !isFinite(atLeast) ? 0 : Math.round(atLeast * 1000) / 10,
    atMost: isNaN(atMost) || !isFinite(atMost) ? 0 : Math.round(atMost * 1000) / 10,
  };
}

export interface OpeningHandProbabilities {
  lands0or1: number;
  lands2: number;
  lands3: number;
  lands4: number;
  lands5plus: number;
  lands2to4: number; // Optimal playable hand
}

export function getOpeningHandProbabilities(
  totalDeck: number = 99,
  totalLands: number = 36
): OpeningHandProbabilities {
  const p0 = calculateHypergeometric(totalDeck, totalLands, 7, 0).exact;
  const p1 = calculateHypergeometric(totalDeck, totalLands, 7, 1).exact;
  const p2 = calculateHypergeometric(totalDeck, totalLands, 7, 2).exact;
  const p3 = calculateHypergeometric(totalDeck, totalLands, 7, 3).exact;
  const p4 = calculateHypergeometric(totalDeck, totalLands, 7, 4).exact;
  const p5plus = calculateHypergeometric(totalDeck, totalLands, 7, 5).atLeast;
  const p2to4 = Math.round((p2 + p3 + p4) * 10) / 10;

  return {
    lands0or1: Math.round((p0 + p1) * 10) / 10,
    lands2: p2,
    lands3: p3,
    lands4: p4,
    lands5plus: p5plus,
    lands2to4: p2to4,
  };
}

export function calculateCommanderOnCurve(
  totalDeck: number = 99,
  totalLands: number = 36,
  commanderCmc: number = 4
): { turn: number; cardsSeen: number; probability: number } {
  // If commander CMC is 4, on turn 4 you see 7 opening + 3 draws (on the play) = 10 cards
  const turn = Math.max(1, commanderCmc);
  const cardsSeen = Math.min(totalDeck, 7 + (turn - 1));
  const res = calculateHypergeometric(totalDeck, totalLands, cardsSeen, turn);
  return {
    turn,
    cardsSeen,
    probability: res.atLeast,
  };
}
