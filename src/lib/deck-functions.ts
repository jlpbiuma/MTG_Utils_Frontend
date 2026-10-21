import type { DeckCardWithOwnership } from "@/lib/schemas";
export const FUNCTION_LABELS = {
  ramp: "Rampa",
  draw: "Robo",
  removal: "Eliminación",
  wipes: "Barridos",
  tutors: "Tutores",
  protection: "Protección",
};
export type DeckFunction = keyof typeof FUNCTION_LABELS;
const patterns: Record<DeckFunction, RegExp> = {
  ramp: /\badd\b[^.]*\bmana\b|\badd\s+(?:\{[WUBRGC]\}|one mana)|search your library[^.]*land[^.]*battlefield/i,
  draw: /draw (?:a|one|two|three|four|\w+) cards?/i,
  removal:
    /(?:destroy|exile) target (?:\w+ ){0,3}(?:creature|permanent|artifact|enchantment|planeswalker)|counter target spell/i,
  wipes:
    /(?:destroy|exile) all (?:\w+ ){0,2}(?:creatures|permanents|artifacts)|each creature[^.]*gets -/i,
  tutors: /search your library[^.]*card/i,
  protection:
    /(?:you control|target creature)[^.]*\b(?:hexproof|indestructible|protection)\b|\bphase out\b/i,
};
const aliases: Record<DeckFunction, string[]> = {
  ramp: ["rampa", "ramp", "mana rock"],
  draw: ["draw", "robo", "card draw"],
  removal: ["removal", "eliminación", "spot removal"],
  wipes: ["wipes", "barridos", "board wipe"],
  tutors: ["tutors", "tutores", "tutor"],
  protection: ["protection", "protección"],
};
export function classifyFunctions(
  card: Pick<DeckCardWithOwnership, "tags" | "oracleText" | "typeLine">,
): DeckFunction[] {
  const tags = (card.tags ?? []).map((t) => t.toLowerCase());
  const text = card.oracleText ?? "";
  return (Object.keys(FUNCTION_LABELS) as DeckFunction[]).filter(
    (key) =>
      aliases[key].some((t) => tags.includes(t)) ||
      (!(key === "ramp" && card.typeLine?.includes("Land")) &&
        patterns[key].test(text)),
  );
}
export function defaultFunctionTargets(cards: DeckCardWithOwnership[]): {
  targets: Record<DeckFunction, number>;
  explanations: Partial<Record<DeckFunction, string>>;
} {
  const targets = {
    ramp: 10,
    draw: 10,
    removal: 10,
    wipes: 3,
    tutors: 2,
    protection: 3,
  };
  const explanations: Partial<Record<DeckFunction, string>> = {};
  const functions = new Set(
    cards
      .filter((c) => c.isCommander && !c.isSideboard)
      .flatMap(classifyFunctions),
  );
  if (functions.has("draw")) {
    targets.draw = 8;
    explanations.draw =
      "Tu comandante tiene un efecto de robo: objetivo sugerido reducido de 10 a 8.";
  }
  if (functions.has("ramp")) {
    targets.ramp = 8;
    explanations.ramp =
      "Tu comandante produce o busca maná: objetivo sugerido reducido de 10 a 8.";
  }
  return { targets, explanations };
}
