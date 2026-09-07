import { describe, it, expect, vi } from "vitest";
import {
  translateTypeLineEs,
  translateRarityEs,
  translateFormatNameEs,
  translateLegalityStatusEs,
  parseRulesTextTokens,
} from "@/lib/card-spanish-dictionary";
import { getCardDetails } from "@/actions/scryfall";

vi.mock("@/lib/api-client", () => ({
  backendFetch: vi.fn().mockImplementation(async (url: string) => {
    if (url.includes("Lightning+Bolt") || url.includes("scry-bolt")) {
      return {
        id: "scry-bolt",
        name: "Lightning Bolt",
        name_es: "Relámpago",
        mana_cost: "{R}",
        cmc: 1,
        type_line: "Instant",
        type_line_es: "Instantáneo",
        oracle_text: "Lightning Bolt deals 3 damage to any target.",
        oracle_text_es: "El Relámpago hace 3 puntos de daño a cualquier objetivo.",
        flavor_text: "A flash of lightning and nothing remained.",
        flavor_text_es: "Un destello de relámpago y nada quedó.",
        rarity: "uncommon",
        rarity_es: "Infrecuente",
        set: "M10",
        set_name: "Magic 2010",
        collector_number: "146",
        artist: "Christopher Moeller",
        has_spanish_print: true,
        image_uris: {
          normal: "https://example.com/bolt.jpg",
        },
        card_faces: [],
        legalities: [
          { format: "commander", format_name: "Commander / EDH", status: "legal", status_es: "Legal" },
          { format: "modern", format_name: "Modern", status: "legal", status_es: "Legal" },
          { format: "standard", format_name: "Estándar", status: "not_legal", status_es: "No legal" },
        ],
        prices: { eur: "2.10", usd: "0.85" },
      };
    }
    return null;
  }),
}));

describe("Card Spanish Localization & Dictionary Unit Tests", () => {
  it("should translate creature and non-creature type lines into Spanish", () => {
    expect(translateTypeLineEs("Creature — Elf Druid")).toBe("Criatura — Elfo Druida");
    expect(translateTypeLineEs("Legendary Creature — Dragon")).toBe("Legendario/a Criatura — Dragón");
    expect(translateTypeLineEs("Instant")).toBe("Instantáneo");
    expect(translateTypeLineEs("Sorcery")).toBe("Conjuro");
    expect(translateTypeLineEs("Artifact Creature — Golem")).toBe("Artefacto Criatura — Golem");
    expect(translateTypeLineEs("Basic Land — Forest")).toBe("Básica Tierra — Bosque");
    expect(translateTypeLineEs("Enchantment — Aura")).toBe("Encantamiento — Aura");
  });

  it("should translate dual-sided type lines correctly", () => {
    const dual = "Legendary Creature — Human Wizard // Instant";
    expect(translateTypeLineEs(dual)).toBe(
      "Legendario/a Criatura — Humano Hechicero // Instantáneo"
    );
  });

  it("should translate rarities into Spanish", () => {
    expect(translateRarityEs("common")).toBe("Común");
    expect(translateRarityEs("uncommon")).toBe("Infrecuente");
    expect(translateRarityEs("rare")).toBe("Rara");
    expect(translateRarityEs("mythic")).toBe("Rara mítica");
  });

  it("should translate format names and legalities into Spanish", () => {
    expect(translateFormatNameEs("commander")).toBe("Commander / EDH");
    expect(translateFormatNameEs("modern")).toBe("Modern");
    expect(translateFormatNameEs("standard")).toBe("Estándar");

    expect(translateLegalityStatusEs("legal")).toEqual({ label: "Legal", color: "green" });
    expect(translateLegalityStatusEs("not_legal")).toEqual({ label: "No legal", color: "gray" });
    expect(translateLegalityStatusEs("banned")).toEqual({ label: "Prohibida", color: "red" });
    expect(translateLegalityStatusEs("restricted")).toEqual({ label: "Restringida", color: "amber" });
  });

  it("should tokenize rules text into text and mana symbols for inline rendering", () => {
    const rules = "{T}: Agrega {G}. El Relámpago hace 3 puntos de daño.";
    const tokens = parseRulesTextTokens(rules);

    expect(tokens).toEqual([
      { type: "symbol", value: "T" },
      { type: "text", value: ": Agrega " },
      { type: "symbol", value: "G" },
      { type: "text", value: ". El Relámpago hace 3 puntos de daño." },
    ]);
  });

  it("should fetch Spanish card details through getCardDetails action", async () => {
    const card = await getCardDetails({ name: "Lightning Bolt" });

    expect(card).not.toBeNull();
    expect(card?.name_es).toBe("Relámpago");
    expect(card?.name).toBe("Lightning Bolt");
    expect(card?.type_line_es).toBe("Instantáneo");
    expect(card?.oracle_text_es).toBe("El Relámpago hace 3 puntos de daño a cualquier objetivo.");
    expect(card?.rarity_es).toBe("Infrecuente");
    expect(card?.has_spanish_print).toBe(true);
    expect(card?.legalities?.some((l) => l.format === "commander" && l.status_es === "Legal")).toBe(true);
  });
});
