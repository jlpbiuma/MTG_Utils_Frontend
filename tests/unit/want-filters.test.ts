import { describe, it, expect } from "vitest";
import { filterWantCards } from "@/lib/want-filters";

const cards = [
  {
    cardName: "Swords to Plowshares",
    cardScryfallId: "stp",
    setCode: "CMM",
    manaCost: "{W}",
    typeLine: "Instant",
  },
  {
    cardName: "Sol Ring",
    cardScryfallId: "sol",
    setCode: "C21",
    manaCost: "{1}",
    typeLine: "Artifact",
  },
  {
    cardName: "Birds of Paradise",
    cardScryfallId: "bop",
    setCode: "CMM",
    manaCost: "{G}",
    typeLine: "Creature — Bird",
  },
];

const quotes = {
  stp: { unitPrice: { trend: 1.5 } },
  sol: { unitPrice: { trend: 2 } },
  bop: { unitPrice: { trend: 8 } },
};

const openFilters = {
  minPrice: null,
  maxPrice: null,
  setCode: "",
  colors: [] as string[],
  colorless: false,
  typeKey: "",
};

describe("filterWantCards", () => {
  it("keeps cards inside the price range", () => {
    const result = filterWantCards(
      cards,
      { ...openFilters, minPrice: 1, maxPrice: 3 },
      quotes
    );
    expect(result.map((c) => c.cardName)).toEqual([
      "Swords to Plowshares",
      "Sol Ring",
    ]);
  });

  it("filters by edition, color and type together", () => {
    const result = filterWantCards(cards, {
      ...openFilters,
      setCode: "cmm",
      colors: ["G"],
      typeKey: "creatures",
    });
    expect(result.map((c) => c.cardName)).toEqual(["Birds of Paradise"]);
  });

  it("keeps only colorless cards when that filter is on", () => {
    const result = filterWantCards(cards, { ...openFilters, colorless: true });
    expect(result.map((c) => c.cardName)).toEqual(["Sol Ring"]);
  });
});
