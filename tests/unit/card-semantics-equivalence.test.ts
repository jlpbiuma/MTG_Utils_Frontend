/**
 * Before/after equivalence for the card rules shared by every screen.
 *
 * tests/fixtures/legacy holds the implementation before the multi-face fixes.
 * Every output over the shared corpus must stay identical except the bug fixes
 * listed in EXPECTED_CHANGES; a new difference, or a listed fix that no longer
 * happens, fails the test. The benchmark asserts the new code is not slower.
 */
import { describe, expect, it } from "vitest";
import corpus from "../fixtures/card-semantics-corpus.json";
import * as legacyCards from "../fixtures/legacy/card-utils";
import * as legacySorting from "../fixtures/legacy/sorting";
import * as legacyAnalytics from "../fixtures/legacy/deck-analytics";
import * as legacyColors from "../fixtures/legacy/deck-colors";
import { getCardCategory, isBasicLand, normalizeCardName } from "@/lib/card-utils";
import { extractCmc } from "@/lib/sorting";
import { parseManaValue } from "@/lib/deck-analytics";
import { extractColorsFromManaCost } from "@/lib/deck-colors";

type CorpusCard = { name: string; manaCost: string | null; typeLine: string | null };
const cards = corpus.cards as CorpusCard[];

const EXPECTED_CHANGES: Record<string, [unknown, unknown]> = {
  // Front-face categorization: a battle or a land that transforms.
  "category|Invasion of Ikoria": ["creatures", "battles"],
  "category|Invasion of Zendikar": ["creatures", "battles"],
  "category|Westvale Abbey // Ormendahl, Profane Prince": ["creatures", "lands"],
  // Adventure cards count only the main half; {HW} costs 0.5.
  "cmc|Bonecrusher Giant // Stomp": [5, 3],
  "cmc|Brazen Borrower // Petty Theft": [5, 3],
  "cmc|Little Girl": [1, 0.5],
  "manaValue|Bonecrusher Giant // Stomp": [5, 3],
  "manaValue|Brazen Borrower // Petty Theft": [5, 3],
  "manaValue|Little Girl": [1, 0.5],
  // Basic lands by exact name: no more always-owned dual lands or creatures.
  "basic|Tropical Island": [true, false],
  "basic|Volcanic Island": [true, false],
  "basic|Mountain Goat": [true, false],
  "basic|Island Fish Jasconius": [true, false],
  "basic|Sapseep Forest": [true, false],
  "basic|Swamp Mosquito": [true, false],
  "basic|Isla del tesoro": [true, false],
  "category|Volcanic Island": ["lands", "other"],
  "category|Mountain Goat": ["lands", "other"],
  "category|Island Fish Jasconius": ["lands", "other"],
  "category|Sapseep Forest": ["lands", "other"],
  "category|Isla del tesoro": ["lands", "other"],
};

function legacyOutputs(card: CorpusCard) {
  return {
    normalized: legacyCards.normalizeCardName(card.name),
    category: legacyCards.getCardCategory(card.typeLine, card.name),
    basic: legacyCards.isBasicLand(card.typeLine, card.name),
    cmc: legacySorting.extractCmc(card.manaCost),
    manaValue: legacyAnalytics.parseManaValue(card.manaCost),
    colors: legacyColors.extractColorsFromManaCost(card.manaCost),
  };
}

function currentOutputs(card: CorpusCard) {
  return {
    normalized: normalizeCardName(card.name),
    category: getCardCategory(card.typeLine, card.name),
    basic: isBasicLand(card.typeLine, card.name),
    cmc: extractCmc(card.manaCost, card.typeLine),
    manaValue: parseManaValue(card.manaCost, card.typeLine),
    colors: extractColorsFromManaCost(card.manaCost),
  };
}

function bestOf(fn: () => void, repeat = 5): number {
  let best = Infinity;
  for (let i = 0; i < repeat; i++) {
    const start = performance.now();
    fn();
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe("card semantics before/after", () => {
  it("matches the legacy rules except the documented fixes", () => {
    const changes: Record<string, [unknown, unknown]> = {};
    for (const card of cards) {
      const before = legacyOutputs(card);
      const after = currentOutputs(card);
      for (const field of Object.keys(before) as (keyof typeof before)[]) {
        if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
          changes[`${field}|${card.name}`] = [before[field], after[field]];
        }
      }
    }
    expect(changes).toEqual(EXPECTED_CHANGES);
  });

  it("is not slower than legacy on a collection-sized pass", () => {
    const rows = Array.from({ length: 6000 }, (_, i) => ({
      name: `Generated Card ${i % 1500}`,
      typeLine: "Creature — Elf",
      manaCost: "{1}{G}{G/W}",
    }));
    const legacyPass = () => rows.forEach((r) => {
      legacyCards.isBasicLand(r.typeLine, r.name);
      legacyCards.getCardCategory(r.typeLine, r.name);
      legacySorting.extractCmc(r.manaCost);
    });
    const currentPass = () => rows.forEach((r) => {
      isBasicLand(r.typeLine, r.name);
      getCardCategory(r.typeLine, r.name);
      extractCmc(r.manaCost, r.typeLine);
    });
    legacyPass();
    currentPass();
    const before = bestOf(legacyPass);
    const after = bestOf(currentPass);
    console.info(`card rules 6000 rows: legacy ${before.toFixed(1)} ms -> current ${after.toFixed(1)} ms (${(before / after).toFixed(1)}x)`);
    expect(after).toBeLessThanOrEqual(before);
  });
});
