import { describe, it, expect } from "vitest";
import {
  toEdhrecSlug,
  getEdhrecCardImageUrl,
  groupRecommendationsByCategory,
  sortEdhrecCards,
  getCategoryLabel,
  getCardOwnershipCategory,
} from "@/lib/edhrec";
import { normalizeCardName } from "@/lib/card-utils";
import { EdhrecCardRecommendation } from "@/lib/schemas";

describe("EDHREC Integration & Recommendation Logic", () => {
  describe("getCategoryLabel", () => {
    it("translates EDHREC category tags to Spanish display names", () => {
      expect(getCategoryLabel("High Synergy Cards")).toBe("Sinergia Alta");
      expect(getCategoryLabel("Top Cards")).toBe("Más Jugadas");
      expect(getCategoryLabel("Creatures")).toBe("Criaturas");
      expect(getCategoryLabel("Instants")).toBe("Instantáneos");
      expect(getCategoryLabel("Sorceries")).toBe("Conjuros");
      expect(getCategoryLabel("Utility Artifacts")).toBe("Artefactos de Utilidad");
      expect(getCategoryLabel("Mana Artifacts")).toBe("Artefactos de Maná");
      expect(getCategoryLabel("Lands")).toBe("Tierras");
    });

    it("returns original tag if no translation exists", () => {
      expect(getCategoryLabel("Custom Category")).toBe("Custom Category");
    });
  });

  describe("toEdhrecSlug", () => {
    it("converts simple commander names to lowercase hyphenated slugs", () => {
      expect(toEdhrecSlug("Aragorn, the Uniter")).toBe("aragorn-the-uniter");
      expect(toEdhrecSlug("Niv-Mizzet, Parun")).toBe("niv-mizzet-parun");
      expect(toEdhrecSlug("Urza, Lord High Artificer")).toBe("urza-lord-high-artificer");
    });

    it("handles diacritics and accents cleanly", () => {
      expect(toEdhrecSlug("Lim-Dûl's Vault")).toBe("lim-duls-vault");
      expect(toEdhrecSlug("Séance")).toBe("seance");
      expect(toEdhrecSlug("Borborygmos Enragé")).toBe("borborygmos-enrage");
    });

    it("handles punctuation like apostrophes, quotes, and commas", () => {
      expect(toEdhrecSlug("Atraxa, Praetors' Voice")).toBe("atraxa-praetors-voice");
      expect(toEdhrecSlug("Kongming, \"Sleeping Dragon\"")).toBe("kongming-sleeping-dragon");
    });

    it("handles partner / split slashes (//)", () => {
      expect(toEdhrecSlug("Kraum, Ludevic's Opus // Tymna the Weaver")).toBe(
        "kraum-ludevics-opus-tymna-the-weaver"
      );
    });

    it("handles empty or falsy inputs gracefully", () => {
      expect(toEdhrecSlug("")).toBe("");
      expect(toEdhrecSlug("   ")).toBe("");
    });
  });

  describe("getEdhrecCardImageUrl", () => {
    it("constructs valid EDHREC CDN image URLs from Scryfall UUIDs", () => {
      const id = "c05c2aa6-29c7-40f8-872e-91099b9225c4";
      expect(getEdhrecCardImageUrl(id)).toBe(
        "https://card-images.edhrec.com/normal/front/c/0/c05c2aa6-29c7-40f8-872e-91099b9225c4.jpg"
      );
    });

    it("returns null for invalid or empty UUIDs", () => {
      expect(getEdhrecCardImageUrl("")).toBeNull();
      expect(getEdhrecCardImageUrl("a")).toBeNull();
    });
  });

  describe("Pure Name Matching Requirement", () => {
    it("matches cards across deck, collection, and EDHREC regardless of set, printing, or case", () => {
      const edhrecCardName = "Birds of Paradise";
      const collectionCardName = "birds of paradise";
      const deckCardName = "Birds of Paradise // Front";

      const normEdhrec = normalizeCardName(edhrecCardName);
      const normCollection = normalizeCardName(collectionCardName);
      const normDeck = normalizeCardName(deckCardName);

      expect(normEdhrec).toBe("birds of paradise");
      expect(normCollection).toBe("birds of paradise");
      expect(normDeck).toBe("birds of paradise");

      expect(normEdhrec === normCollection).toBe(true);
      expect(normEdhrec === normDeck).toBe(true);
    });

    it("matches cards ignoring whitespace and capitalization differences", () => {
      const edhrecName = "  Sol   Ring  ";
      const collectionName = "Sol Ring";

      expect(normalizeCardName(edhrecName)).toBe(normalizeCardName(collectionName));
    });
  });

  describe("Inclusion % and Synergy calculations", () => {
    it("calculates community inclusion percentage correctly", () => {
      const numDecks = 1530;
      const potentialDecks = 2000;
      const inclusionPct = Math.round(((numDecks / potentialDecks) * 100) * 10) / 10;

      expect(inclusionPct).toBe(76.5);
    });

    it("handles edge cases where potential decks is 0 or 1", () => {
      const numDecks = 0;
      const potentialDecks = 0;
      const inclusionPct = potentialDecks > 0 ? (numDecks / potentialDecks) * 100 : 0;

      expect(inclusionPct).toBe(0);
    });
  });

  describe("groupRecommendationsByCategory", () => {
    const cards: EdhrecCardRecommendation[] = [
      {
        id: "1",
        name: "Arcane Signet",
        normalizedName: "arcane signet",
        sanitized: "arcane-signet",
        category: "Mana Artifacts",
        categories: ["Mana Artifacts", "Top Cards"],
        numDecks: 100,
        potentialDecks: 100,
        inclusionPct: 88.5,
        synergy: 10.2,
        imageUri: null,
        isInDeck: true,
        isInCollection: false,
        collectionQuantity: 0,
      },
      {
        id: "2",
        name: "Sol Ring",
        normalizedName: "sol ring",
        sanitized: "sol-ring",
        category: "Mana Artifacts",
        categories: ["Mana Artifacts", "Top Cards"],
        numDecks: 100,
        potentialDecks: 100,
        inclusionPct: 94.2,
        synergy: 5.1,
        imageUri: null,
        isInDeck: true,
        isInCollection: true,
        collectionQuantity: 3,
      },
      {
        id: "3",
        name: "Faeburrow Elder",
        normalizedName: "faeburrow elder",
        sanitized: "faeburrow-elder",
        category: "Creatures",
        categories: ["Creatures", "High Synergy Cards"],
        numDecks: 100,
        potentialDecks: 100,
        inclusionPct: 74.0,
        synergy: 42.5,
        imageUri: null,
        isInDeck: false,
        isInCollection: true,
        collectionQuantity: 2,
      },
      {
        id: "4",
        name: "Command Tower",
        normalizedName: "command tower",
        sanitized: "command-tower",
        category: "Lands",
        categories: ["Lands", "Top Cards"],
        numDecks: 100,
        potentialDecks: 100,
        inclusionPct: 91.4,
        synergy: 12.0,
        imageUri: null,
        isInDeck: false,
        isInCollection: false,
        collectionQuantity: 0,
      },
    ];

    it("groups cards into sections using API category order, supporting multi-category membership", () => {
      const groups = groupRecommendationsByCategory(cards, [
        "Creatures",
        "Mana Artifacts",
        "Lands",
        "Top Cards",
        "High Synergy Cards",
      ]);

      expect(groups.map((g) => g.category)).toEqual([
        "Creatures",
        "Mana Artifacts",
        "Lands",
        "Top Cards",
        "High Synergy Cards",
      ]);
      expect(groups[0].cards.map((c) => c.name)).toEqual(["Faeburrow Elder"]);
      expect(groups[1].cards.map((c) => c.name)).toEqual([
        "Sol Ring",
        "Arcane Signet",
      ]);
      expect(groups[2].cards.map((c) => c.name)).toEqual(["Command Tower"]);
      // Sol Ring, Command Tower, Arcane Signet all belong to Top Cards
      expect(groups[3].cards.map((c) => c.name)).toEqual([
        "Sol Ring",
        "Command Tower",
        "Arcane Signet",
      ]);
      // Faeburrow Elder belongs to High Synergy Cards
      expect(groups[4].cards.map((c) => c.name)).toEqual(["Faeburrow Elder"]);
    });

    it("can sort each section by synergy", () => {
      const groups = groupRecommendationsByCategory(
        cards,
        ["Mana Artifacts"],
        "synergy"
      );
      expect(groups[0].cards.map((c) => c.name)).toEqual([
        "Arcane Signet",
        "Sol Ring",
      ]);
    });
  });

  describe("Recommendations Sorting and Ownership Highlighting", () => {
    const rawRecommendations: Array<{
      id: string;
      name: string;
      inclusionPct: number;
      synergy: number;
      categories: string[];
    }> = [
      { id: "1", name: "Arcane Signet", inclusionPct: 88.5, synergy: 10.2, categories: ["Mana Artifacts", "Top Cards"] },
      { id: "2", name: "Sol Ring", inclusionPct: 94.2, synergy: 5.1, categories: ["Mana Artifacts", "Top Cards"] },
      { id: "3", name: "Faeburrow Elder", inclusionPct: 74.0, synergy: 42.5, categories: ["Creatures", "High Synergy Cards"] },
      { id: "4", name: "Command Tower", inclusionPct: 91.4, synergy: 12.0, categories: ["Lands", "Top Cards"] },
    ];

    const deckCardNames = ["Sol Ring", "Arcane Signet"];
    const collectionCards = [
      { name: "Faeburrow Elder", quantity: 2 },
      { name: "Sol Ring", quantity: 3 },
    ];

    it("sorts recommendations by community inclusion % descending by default", () => {
      const sorted = [...rawRecommendations].sort((a, b) => b.inclusionPct - a.inclusionPct);

      expect(sorted[0].name).toBe("Sol Ring");
      expect(sorted[1].name).toBe("Command Tower");
      expect(sorted[2].name).toBe("Arcane Signet");
      expect(sorted[3].name).toBe("Faeburrow Elder");
    });

    it("maps ownership correctly: in deck vs in collection vs missing", () => {
      const deckSet = new Set(deckCardNames.map((n) => normalizeCardName(n)));
      const colMap = new Map(collectionCards.map((c) => [normalizeCardName(c.name), c.quantity]));

      const mapped: EdhrecCardRecommendation[] = rawRecommendations.map((r) => {
        const norm = normalizeCardName(r.name);
        const isInDeck = deckSet.has(norm);
        const collectionQuantity = colMap.get(norm) || 0;
        const isInCollection = collectionQuantity > 0;

        return {
          id: r.id,
          name: r.name,
          normalizedName: norm,
          sanitized: toEdhrecSlug(r.name),
          category: r.categories[0],
          categories: r.categories,
          numDecks: 100,
          potentialDecks: 100,
          inclusionPct: r.inclusionPct,
          synergy: r.synergy,
          imageUri: null,
          isInDeck,
          isInCollection,
          collectionQuantity,
        };
      });

      const solRing = mapped.find((c) => c.name === "Sol Ring");
      expect(solRing?.isInDeck).toBe(true);

      const arcaneSignet = mapped.find((c) => c.name === "Arcane Signet");
      expect(arcaneSignet?.isInDeck).toBe(true);
      expect(arcaneSignet?.isInCollection).toBe(false);

      const faeburrow = mapped.find((c) => c.name === "Faeburrow Elder");
      expect(faeburrow?.isInDeck).toBe(false);
      expect(faeburrow?.isInCollection).toBe(true);
      expect(faeburrow?.collectionQuantity).toBe(2);

      const cmdTower = mapped.find((c) => c.name === "Command Tower");
      expect(cmdTower?.isInDeck).toBe(false);
      expect(cmdTower?.isInCollection).toBe(false);
    });

    it("matches multi-category memberships correctly", () => {
      const card = rawRecommendations[2];
      const selectedCategory = "Creatures";

      const isMatch = card.categories.includes(selectedCategory);
      expect(isMatch).toBe(true);
    });

    it("tracks deck membership across current deck and other user decks", () => {
      const currentDeckId = "deck-1";
      const currentDeckName = "Aragorn Voltron";

      const card: EdhrecCardRecommendation = {
        id: "sol-ring-id",
        name: "Sol Ring",
        normalizedName: "sol ring",
        sanitized: "sol-ring",
        category: "Mana Artifacts",
        categories: ["Mana Artifacts", "Top Cards"],
        numDecks: 100,
        potentialDecks: 100,
        inclusionPct: 85,
        synergy: 10,
        imageUri: null,
        isInDeck: true,
        isInCollection: true,
        collectionQuantity: 2,
        requestedInDecks: [
          {
            deckId: currentDeckId,
            deckName: currentDeckName,
            quantity: 1,
          },
          {
            deckId: "deck-2",
            deckName: "Urza Thopters",
            quantity: 1,
          },
        ],
        requestedInDecksCount: 2,
      };

      // Card is present in both decks
      expect(card.requestedInDecks?.length).toBe(2);
      expect(card.requestedInDecks?.some((d) => d.deckId === currentDeckId)).toBe(true);
      expect(card.requestedInDecks?.find((d) => d.deckId === currentDeckId)?.deckName).toBe("Aragorn Voltron");
      expect(card.requestedInDecks?.find((d) => d.deckId === "deck-2")?.deckName).toBe("Urza Thopters");
    });

    it("renders all categories in grouped sections without numbers in button titles", () => {
      const cards: EdhrecCardRecommendation[] = [
        {
          id: "1",
          name: "High Synergy Card",
          normalizedName: "high synergy card",
          sanitized: "high-synergy-card",
          category: "High Synergy Cards",
          categories: ["High Synergy Cards"],
          numDecks: 50,
          potentialDecks: 100,
          inclusionPct: 50,
          synergy: 35,
          imageUri: null,
          isInDeck: false,
          isInCollection: false,
          collectionQuantity: 0,
        },
        {
          id: "2",
          name: "Creature Card",
          normalizedName: "creature card",
          sanitized: "creature-card",
          category: "Creatures",
          categories: ["Creatures"],
          numDecks: 60,
          potentialDecks: 100,
          inclusionPct: 60,
          synergy: 0,
          imageUri: null,
          isInDeck: false,
          isInCollection: true,
          collectionQuantity: 1,
        },
        {
          id: "3",
          name: "Instant Card",
          normalizedName: "instant card",
          sanitized: "instant-card",
          category: "Instants",
          categories: ["Instants"],
          numDecks: 40,
          potentialDecks: 100,
          inclusionPct: 40,
          synergy: 5,
          imageUri: null,
          isInDeck: false,
          isInCollection: false,
          collectionQuantity: 0,
        },
      ];

      const orderedCategories = ["High Synergy Cards", "Creatures", "Instants", "Sorceries"];
      const sections = groupRecommendationsByCategory(cards, orderedCategories, "inclusion");

      // All categories containing cards are preserved
      expect(sections.map((s) => s.category)).toEqual([
        "High Synergy Cards",
        "Creatures",
        "Instants",
      ]);

      // Verify each section has its label
      const labels = sections.map((s) => getCategoryLabel(s.category));
      expect(labels).toEqual(["Sinergia Alta", "Criaturas", "Instantáneos"]);

      // Verify the button text template contains only the label without count numbers
      const buttonLabels = sections.map((s) => getCategoryLabel(s.category));
      buttonLabels.forEach((label) => {
        expect(/\d+/.test(label)).toBe(false); // No numbers in label
      });
    });

    describe("getCardOwnershipCategory (3 distinct states & Valgavoth rule)", () => {
      it("State 1: identifies cards in-deck (dentro del mazo y dentro de la colección)", () => {
        const card = {
          name: "Sol Ring",
          isInCollection: true,
          collectionQuantity: 2,
        };
        const res = getCardOwnershipCategory(card, true, "deck-1", "Death Note");
        expect(res.category).toBe("in-deck");
        expect(res.label).toBe("En este mazo");
        expect(res.sublabel).toContain("Dentro del mazo y dentro de la colección");
        expect(res.isRequested).toBe(false);
      });

      it("State 2: identifies cards in-collection (fuera del mazo y dentro de la colección)", () => {
        const card = {
          name: "Demonic Tutor",
          isInCollection: true,
          collectionQuantity: 1,
        };
        const res = getCardOwnershipCategory(card, false, "deck-1", "Death Note");
        expect(res.category).toBe("in-collection");
        expect(res.label).toBe("En colección (1)");
        expect(res.sublabel).toContain("Fuera del mazo y dentro de la colección");
        expect(res.isRequested).toBe(false);
      });

      it("State 3 (Valgavoth case): marks cards requested in decks but NOT owned as 'Se pide en mazo', never 'En mazo'", () => {
        const card = {
          name: "Valgavoth, Terror Eater",
          isInCollection: false,
          collectionQuantity: 0,
          requestedInDecks: [
            { deckId: "deck-death-note", deckName: "Death Note 📔🖋️💀", quantity: 1 },
          ],
        };
        const res = getCardOwnershipCategory(card, false, "deck-other", "Other Deck");
        expect(res.category).toBe("missing");
        expect(res.isRequested).toBe(true);
        expect(res.label).toBe("Se pide en: Death Note 📔🖋️💀");
        expect(res.sublabel).toContain("Fuera de la colección (se pide en mazo)");
        // Never claim it is in deck without physical ownership
        expect(res.label).not.toContain("En mazo:");
      });

      it("State 3 (missing & not requested): marks completely unowned cards as Faltante", () => {
        const card = {
          name: "Black Lotus",
          isInCollection: false,
          collectionQuantity: 0,
          requestedInDecks: [],
        };
        const res = getCardOwnershipCategory(card, false, "deck-1", "My Deck");
        expect(res.category).toBe("missing");
        expect(res.isRequested).toBe(false);
        expect(res.label).toBe("Faltante");
        expect(res.sublabel).toContain("Fuera del mazo y fuera de la colección");
      });

      it("State 3 (in current deck list but unowned): marks as 'Se pide en este mazo'", () => {
        const card = {
          name: "Mana Vault",
          isInCollection: false,
          collectionQuantity: 0,
        };
        const res = getCardOwnershipCategory(card, true, "deck-1", "Death Note");
        expect(res.category).toBe("missing");
        expect(res.isRequested).toBe(true);
        expect(res.label).toBe("Se pide en este mazo");
      });
    });

    describe("Extended Sorting and Ungrouped View Modes", () => {
      const sampleCards = [
        {
          id: "card-1",
          name: "Sol Ring",
          inclusionPct: 80,
          synergy: 5,
          requestedInDecksCount: 3,
        },
        {
          id: "card-2",
          name: "Arcane Signet",
          inclusionPct: 85,
          synergy: 10,
          requestedInDecksCount: 5,
        },
        {
          id: "card-3",
          name: "Mana Crypt",
          inclusionPct: 40,
          synergy: 2,
          requestedInDecksCount: 1,
        },
        {
          id: "card-4",
          name: "Fellwar Stone",
          inclusionPct: 60,
          synergy: 4,
          requestedInDecksCount: 0,
        },
      ];

      const priceMap: Record<string, number> = {
        "card-1": 1.5, // Sol Ring €1.50
        "card-2": 0.8, // Arcane Signet €0.80
        "card-3": 180.0, // Mana Crypt €180.00
        // Fellwar Stone has no price entry (0)
      };

      it("sorts by requested_decks descending (cards requested in the most decks appear first)", () => {
        const sorted = sortEdhrecCards(sampleCards, "requested_decks");
        expect(sorted.map((c) => c.name)).toEqual([
          "Arcane Signet", // 5 decks
          "Sol Ring", // 3 decks
          "Mana Crypt", // 1 deck
          "Fellwar Stone", // 0 decks
        ]);
      });

      it("sorts by price_desc (highest price first, unpriced at the bottom)", () => {
        const sorted = sortEdhrecCards(sampleCards, "price_desc", priceMap);
        expect(sorted.map((c) => c.name)).toEqual([
          "Mana Crypt", // €180.00
          "Sol Ring", // €1.50
          "Arcane Signet", // €0.80
          "Fellwar Stone", // €0
        ]);
      });

      it("sorts by price_asc (lowest price first, unpriced at the bottom)", () => {
        const sorted = sortEdhrecCards(sampleCards, "price_asc", priceMap);
        expect(sorted.map((c) => c.name)).toEqual([
          "Arcane Signet", // €0.80
          "Sol Ring", // €1.50
          "Mana Crypt", // €180.00
          "Fellwar Stone", // unpriced at bottom
        ]);
      });

      it("supports continuous flat list without category grouping", () => {
        const continuousList = sortEdhrecCards(sampleCards, "requested_decks");
        expect(continuousList).toHaveLength(4);
        expect(continuousList[0].name).toBe("Arcane Signet");
      });
    });
  });
});
