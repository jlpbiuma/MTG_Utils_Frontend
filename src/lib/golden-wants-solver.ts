import type { PriorityItem } from "@/actions/priorities";

export type PriceOpportunityFilter = "all" | "falling" | "historical_low" | "opportunities";

export function priceChange(item: PriorityItem): number | null | undefined {
  return item.priceChangePercent !== undefined ? item.priceChangePercent : item.change30dPercent;
}

export function matchesPriceOpportunity(item: PriorityItem, filter: PriceOpportunityFilter): boolean {
  const falling = priceChange(item) != null && priceChange(item)! < 0;
  if (filter === "falling") return falling;
  if (filter === "historical_low") return item.atHistoricalLow === true;
  if (filter === "opportunities") return falling || item.atHistoricalLow === true;
  return true;
}

export function comparePriceOpportunities(a: PriorityItem, b: PriorityItem): number {
  return Number(b.atHistoricalLow === true) - Number(a.atHistoricalLow === true)
    || (priceChange(a) ?? Infinity) - (priceChange(b) ?? Infinity)
    || a.price - b.price;
}

export type GoldenWantsStrategy = "complete_decks" | "max_completion";

export interface GoldenWantsCartItem {
  cardName: string;
  cardScryfallId: string;
  imageUri?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  quantityToBuy: number;
  unitPrice: number;
  totalCost: number;
  targetDecks: { deckId: string; deckName: string; completionBefore: number }[];
}

export interface ProjectedDeckProgress {
  deckId: string;
  deckName: string;
  before: number;
  after: number;
  gainedPercentage: number;
  cardsFulfilled: number;
  totalMissingInitially: number;
}

export interface GoldenWantsResult {
  cart: GoldenWantsCartItem[];
  totalCost: number;
  budgetRemaining: number;
  completedDecks: { deckId: string; deckName: string }[];
  projectedProgress: ProjectedDeckProgress[];
  totalCardsToBuy: number;
}

interface UnitItem {
  cardName: string;
  cardScryfallId: string;
  imageUri?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  unitPrice: number;
  costInCents: number;
  targetDecks: { deckId: string; deckName: string; completionBefore: number }[];
  highestDeckCompletion: number;
  priorityScore: number;
}

export function solveGoldenWants(
  items: PriorityItem[],
  budget: number,
  strategy: GoldenWantsStrategy,
  priceFilter: PriceOpportunityFilter = "all",
  omittedIds: ReadonlySet<string> = new Set()
): GoldenWantsResult {
  const budgetCents = Math.max(0, Math.floor(budget * 100));
  if (budgetCents <= 0 || items.length === 0) {
    return {
      cart: [],
      totalCost: 0,
      budgetRemaining: budget,
      completedDecks: [],
      projectedProgress: [],
      totalCardsToBuy: 0,
    };
  }

  interface DeckOverview {
    name: string;
    completion: number;
    totalCards: number;
    missingInDeck: number;
    availableInCandidates: number;
  }

  // Collect deck overview for all decks involved
  const deckInitialMissing = new Map<string, DeckOverview>();
  for (const item of items) {
    for (const d of item.decks) {
      if (!deckInitialMissing.has(d.deckId)) {
        const totalCards = d.deckTotalCards && d.deckTotalCards > 0 ? d.deckTotalCards : 100;
        const missingInDeck =
          typeof d.deckMissingCards === "number" && d.deckMissingCards >= 0
            ? d.deckMissingCards
            : Math.max(0, Math.round(((100 - d.completionPercentage) / 100) * totalCards));

        deckInitialMissing.set(d.deckId, {
          name: d.deckName,
          completion: d.completionPercentage,
          totalCards,
          missingInDeck,
          availableInCandidates: 0,
        });
      }
      const entry = deckInitialMissing.get(d.deckId)!;
      if (d.missingQuantity > 0) {
        entry.availableInCandidates += d.missingQuantity;
      }
    }
  }

  // Decompose cards into purchasable units: 1 single unit per card satisfies ALL decks that request it
  const units: UnitItem[] = [];
  for (const item of items) {
    if (item.deficit <= 0 || omittedIds.has(item.cardScryfallId) || !matchesPriceOpportunity(item, priceFilter)) continue;
    const unitPrice = item.price > 0 ? item.price : 0.25; // default fallback if unpriced
    const costInCents = Math.max(1, Math.round(unitPrice * 100));

    const targetDecks = item.decks
      .filter((d) => d.missingQuantity > 0)
      .map((d) => ({
        deckId: d.deckId,
        deckName: d.deckName,
        completionBefore: d.completionPercentage,
      }));

    if (targetDecks.length === 0) continue;

    const highestDeckCompletion = Math.max(...targetDecks.map((d) => d.completionBefore));

    // Priority score based on strategy
    let score = 1;
    if (strategy === "complete_decks") {
      score = Math.pow(highestDeckCompletion / 10, 3) * (1 + targetDecks.length * 1.5);
    } else {
      score = item.decks.reduce((gain, deck) =>
        gain + (deck.missingQuantity > 0 ? 100 / Math.max(1, deck.deckTotalCards || 100) : 0), 0);
    }

    units.push({
      cardName: item.cardName,
      cardScryfallId: item.cardScryfallId,
      imageUri: item.imageUri,
      manaCost: item.manaCost,
      typeLine: item.typeLine,
      unitPrice,
      costInCents,
      targetDecks,
      highestDeckCompletion,
      priorityScore: score,
    });
  }

  if (units.length === 0) {
    return {
      cart: [],
      totalCost: 0,
      budgetRemaining: budget,
      completedDecks: [],
      projectedProgress: [],
      totalCardsToBuy: 0,
    };
  }

  const selectedUnits: UnitItem[] = [];

  if (strategy === "complete_decks") {
    const sortedDeckIds = Array.from(deckInitialMissing.keys()).sort((a, b) => {
      const deckA = deckInitialMissing.get(a)!;
      const deckB = deckInitialMissing.get(b)!;
      if (deckB.completion !== deckA.completion) {
        return deckB.completion - deckA.completion; // Highest completion first
      }
      return deckA.missingInDeck - deckB.missingInDeck; // Fewest missing cards first
    });

    const selectedUnitSet = new Set<string>();
    let currentSpendCents = 0;

    // First pass: try to fully finish decks in order of closeness
    // A deck can ONLY be completed if ALL its missing cards are available in units and fit within budget
    for (const dId of sortedDeckIds) {
      const deckInfo = deckInitialMissing.get(dId)!;
      if (deckInfo.completion >= 100 || deckInfo.missingInDeck <= 0) continue;

      const neededUnits = units.filter(
        (u) => !selectedUnitSet.has(u.cardScryfallId) && u.targetDecks.some((d) => d.deckId === dId)
      );

      // Only attempt to complete if ALL missing cards for this deck are present in candidates
      if (neededUnits.length < deckInfo.missingInDeck) {
        continue;
      }

      const costToFinish = neededUnits.reduce((sum, u) => sum + u.costInCents, 0);

      if (costToFinish > 0 && currentSpendCents + costToFinish <= budgetCents) {
        for (const u of neededUnits) {
          selectedUnitSet.add(u.cardScryfallId);
          selectedUnits.push(u);
        }
        currentSpendCents += costToFinish;
      }
    }

    // Second pass: with remaining budget, pick cheapest units for closest-to-finish decks
    const remainingUnits = units.filter((u) => !selectedUnitSet.has(u.cardScryfallId));
    remainingUnits.sort((a, b) => {
      if (b.highestDeckCompletion !== a.highestDeckCompletion) {
        return b.highestDeckCompletion - a.highestDeckCompletion;
      }
      return a.costInCents - b.costInCents;
    });

    for (const u of remainingUnits) {
      if (currentSpendCents + u.costInCents <= budgetCents) {
        selectedUnitSet.add(u.cardScryfallId);
        selectedUnits.push(u);
        currentSpendCents += u.costInCents;
      }
    }
  } else {
    // Strategy: "max_completion" - Knapsack DP (or greedy ratio if large)
    const capacity = budgetCents;
    const totalOps = capacity * units.length;
    if (totalOps <= 4_000_000) {
      const dp: number[] = new Array(capacity + 1).fill(0);
      const chosen: boolean[][] = Array.from({ length: units.length }, () =>
        new Array(capacity + 1).fill(false)
      );

      for (let i = 0; i < units.length; i++) {
        const cost = units[i].costInCents;
        const val = units[i].priorityScore;
        for (let c = capacity; c >= cost; c--) {
          if (dp[c - cost] + val > dp[c]) {
            dp[c] = dp[c - cost] + val;
            chosen[i][c] = true;
          }
        }
      }

      // Backtrack
      let currC = capacity;
      for (let i = units.length - 1; i >= 0; i--) {
        if (chosen[i][currC]) {
          selectedUnits.push(units[i]);
          currC -= units[i].costInCents;
        }
      }
    } else {
      // Greedy by value/cost
      const sorted = [...units].sort(
        (a, b) => b.priorityScore / b.costInCents - a.priorityScore / a.costInCents
      );
      let currentSpend = 0;
      for (const u of sorted) {
        if (currentSpend + u.costInCents <= capacity) {
          selectedUnits.push(u);
          currentSpend += u.costInCents;
        }
      }
    }
  }

  // Aggregate selected units into Cart Items
  const cart: GoldenWantsCartItem[] = [];
  let totalCostCents = 0;

  for (const u of selectedUnits) {
    totalCostCents += u.costInCents;
    cart.push({
      cardName: u.cardName,
      cardScryfallId: u.cardScryfallId,
      imageUri: u.imageUri,
      manaCost: u.manaCost,
      typeLine: u.typeLine,
      quantityToBuy: 1,
      unitPrice: u.unitPrice,
      totalCost: u.unitPrice,
      targetDecks: u.targetDecks,
    });
  }

  cart.sort((a, b) => b.totalCost - a.totalCost);
  const totalCost = totalCostCents / 100;
  const budgetRemaining = Math.max(0, Math.round((budget - totalCost) * 100) / 100);

  // Calculate projected deck progress
  const fulfilledPerDeck = new Map<string, number>();
  for (const u of selectedUnits) {
    for (const d of u.targetDecks) {
      fulfilledPerDeck.set(d.deckId, (fulfilledPerDeck.get(d.deckId) || 0) + 1);
    }
  }

  const projectedProgress: ProjectedDeckProgress[] = [];
  const completedDecks: { deckId: string; deckName: string }[] = [];

  for (const [deckId, info] of deckInitialMissing.entries()) {
    const fulfilled = fulfilledPerDeck.get(deckId) || 0;
    const trueMissing = info.missingInDeck;
    const totalCards = Math.max(1, info.totalCards);

    const initialOwned = Math.max(0, totalCards - trueMissing);
    const newOwned = Math.min(totalCards, initialOwned + fulfilled);

    // Deck only completes to 100% if ALL missing cards in the deck are fulfilled
    const isFullyCompleted = trueMissing > 0 && fulfilled >= trueMissing;
    const after = isFullyCompleted
      ? 100.0
      : Math.min(99.9, Math.round((newOwned / totalCards) * 1000) / 10);

    const gained = Math.max(0, Math.round((after - info.completion) * 10) / 10);

    if (isFullyCompleted && info.completion < 100) {
      completedDecks.push({ deckId, deckName: info.name });
    }

    if (fulfilled > 0 || (info.completion > 0 && info.completion < 100)) {
      projectedProgress.push({
        deckId,
        deckName: info.name,
        before: Math.round(info.completion * 10) / 10,
        after,
        gainedPercentage: gained,
        cardsFulfilled: fulfilled,
        totalMissingInitially: trueMissing,
      });
    }
  }

  projectedProgress.sort((a, b) => b.after - a.after);

  return {
    cart,
    totalCost,
    budgetRemaining,
    completedDecks,
    projectedProgress,
    totalCardsToBuy: selectedUnits.length,
  };
}
