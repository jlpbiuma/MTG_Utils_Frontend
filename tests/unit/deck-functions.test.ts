import { describe, it, expect } from "vitest";
import {
  classifyFunctions,
  defaultFunctionTargets,
} from "@/lib/deck-functions";
import { extractPipsAndSources } from "@/lib/deck-analytics";
import type { DeckCardWithOwnership } from "@/lib/schemas";
const card = (
  overrides: Partial<DeckCardWithOwnership>,
): DeckCardWithOwnership => ({
  id: "c",
  deckId: "d",
  cardScryfallId: "p",
  cardName: "Test",
  quantity: 1,
  assignedQuantity: 0,
  isSideboard: false,
  manaCost: null,
  typeLine: null,
  imageUri: null,
  ownedInCollection: 0,
  availableToAssign: 0,
  assignedInOtherDecks: [],
  missingCount: 1,
  ...overrides,
});
describe("deck function estimates and explicit mana sources", () => {
  it("classifies rules and manual tags without treating a basic land as ramp", () => {
    expect(
      classifyFunctions(card({ oracleText: "Draw two cards." })),
    ).toContain("draw");
    expect(classifyFunctions(card({ tags: ["Rampa", "Protección"] }))).toEqual([
      "ramp",
      "protection",
    ]);
    expect(
      classifyFunctions(
        card({ typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}." }),
      ),
    ).not.toContain("ramp");
  });
  it("adjusts commander targets and explains them; excludes a sideboard commander", () => {
    const commander = card({
      isCommander: true,
      oracleText: "Whenever you attack, draw a card.",
    });
    expect(defaultFunctionTargets([commander]).targets.draw).toBe(8);
    expect(defaultFunctionTargets([commander]).explanations.draw).toContain(
      "comandante",
    );
    expect(
      defaultFunctionTargets([{ ...commander, isSideboard: true }]).targets
        .draw,
    ).toBe(10);
  });
  it("counts dual lands and rocks once per produced color and omits sideboard sources", () => {
    const sources = extractPipsAndSources(
      [
        card({
          cardName: "Command Tower",
          typeLine: "Land",
          producedMana: ["W", "U", "U"],
        }),
        card({ id: "rock", typeLine: "Artifact", producedMana: ["W", "U"] }),
        card({
          id: "side",
          isSideboard: true,
          typeLine: "Land",
          producedMana: ["U"],
        }),
      ],
      ["W", "U"],
    ).sources;
    expect(sources.W).toBe(2);
    expect(sources.U).toBe(2);
    expect(sources.G).toBe(0);
  });
});

it("requires more sources for an early colored spell and excludes rocks unavailable that turn", async () => {
  const { calculateKarstenRecommendations } = await import("@/lib/deck-analytics");
  const base = [card({id:"lands",cardName:"Island",typeLine:"Basic Land — Island",quantity:28,producedMana:["U"]}),card({id:"rocks",typeLine:"Artifact",quantity:6,manaCost:"{2}",producedMana:["U"]}),card({id:"filler",typeLine:"Creature",quantity:64,manaCost:"{5}"})];
  const early=[...base,card({id:"spell",manaCost:"{U}",typeLine:"Instant"})];
  const late=[...base,card({id:"spell",manaCost:"{4}{U}",typeLine:"Instant"})];
  const first=calculateKarstenRecommendations(early,extractPipsAndSources(early,["U"]).sources,["U"])[0];
  const fifth=calculateKarstenRecommendations(late,extractPipsAndSources(late,["U"]).sources,["U"])[0];
  expect(first.sourcesRecommended).toBeGreaterThan(fifth.sourcesRecommended);
  expect(first.sourcesOwned).toBe(28);expect(fifth.sourcesOwned).toBe(34);
});
