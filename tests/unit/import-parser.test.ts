import { describe, it, expect } from "vitest";
import {
  parseDecklistText,
  parseCollectionText,
  ImportError,
} from "@/lib/parser";

describe("Decklist & Collection Text Parser (Swift Parity Suite)", () => {
  it("should parse standard plaintext lines with quantities", () => {
    const text = `
      4 Lightning Bolt
      2 Counterspell
      1 Sol Ring
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      quantity: 4,
      name: "Lightning Bolt",
      set: undefined,
      collectorNumber: undefined,
      isSideboard: false,
    });
    expect(parsed[1].quantity).toBe(2);
    expect(parsed[1].name).toBe("Counterspell");
    expect(parsed[2].quantity).toBe(1);
    expect(parsed[2].name).toBe("Sol Ring");
  });

  it("should handle '4x' notation and default quantity to 1 if omitted", () => {
    const text = `
      4x Brainstorm
      Black Lotus
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].quantity).toBe(4);
    expect(parsed[0].name).toBe("Brainstorm");
    expect(parsed[1].quantity).toBe(1);
    expect(parsed[1].name).toBe("Black Lotus");
  });

  it("should parse Moxfield export format with sets and foil flags", () => {
    const text = `
      1 Atraxa, Praetors' Voice (2XM) 198 *F*
      1 Sol Ring (C21) 263
      4 Lightning Bolt (CLB) 123 *E*
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      quantity: 1,
      name: "Atraxa, Praetors' Voice",
      set: "2xm",
      collectorNumber: "198",
      isSideboard: false,
    });
    expect(parsed[1].name).toBe("Sol Ring");
    expect(parsed[1].set).toBe("c21");
    expect(parsed[1].collectorNumber).toBe("263");
    expect(parsed[2].name).toBe("Lightning Bolt");
    expect(parsed[2].set).toBe("clb");
  });

  it("should detect Sideboard sections correctly", () => {
    const text = `
      4 Lightning Bolt
      2 Counterspell

      // Sideboard
      2 Pyroblast
      1 Red Elemental Blast
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(4);
    expect(parsed[0].isSideboard).toBe(false);
    expect(parsed[1].isSideboard).toBe(false);
    expect(parsed[2].name).toBe("Pyroblast");
    expect(parsed[2].isSideboard).toBe(true);
    expect(parsed[3].name).toBe("Red Elemental Blast");
    expect(parsed[3].isSideboard).toBe(true);
  });

  it("should support MTG Arena format headers like 'Deck' and 'Sideboard'", () => {
    const text = `
      Deck
      4 Thoughtseize (AKR) 127
      2 Fatal Push (KLR) 84

      Sideboard
      2 Duress (M21) 96
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].isSideboard).toBe(false);
    expect(parsed[0].name).toBe("Thoughtseize");
    expect(parsed[1].isSideboard).toBe(false);
    expect(parsed[2].isSideboard).toBe(true);
    expect(parsed[2].name).toBe("Duress");
  });

  it("should support SB: prefix on individual lines", () => {
    const text = `
      4 Lightning Bolt
      SB: 2 Smash to Smithereens
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].isSideboard).toBe(false);
    expect(parsed[1].isSideboard).toBe(true);
    expect(parsed[1].name).toBe("Smash to Smithereens");
    expect(parsed[1].quantity).toBe(2);
  });

  it("should parse alphanumeric collector numbers (e.g. 191p, 360s *F*, E02-3)", () => {
    const text = `
      1 Annie Joins Up (LCC) 191p
      1 Sea of Clouds (PCLB) 360s *F*
      1 Path to Exile (PLST) E02-3
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].name).toBe("Annie Joins Up");
    expect(parsed[0].set).toBe("lcc");
    expect(parsed[0].collectorNumber).toBe("191p");

    expect(parsed[1].name).toBe("Sea of Clouds");
    expect(parsed[1].set).toBe("pclb");
    expect(parsed[1].collectorNumber).toBe("360s");

    expect(parsed[2].name).toBe("Path to Exile");
    expect(parsed[2].set).toBe("plst");
    expect(parsed[2].collectorNumber).toBe("E02-3");
  });

  it("should support bracket set tag format like [ANA:1]", () => {
    const text = `
      1 Island [ANA:1]
      2 Mountain (MKM) 283
    `;

    const parsed = parseDecklistText(text);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("Island");
    expect(parsed[0].set).toBe("ana");
    expect(parsed[0].collectorNumber).toBe("1");

    expect(parsed[1].name).toBe("Mountain");
    expect(parsed[1].set).toBe("mkm");
    expect(parsed[1].collectorNumber).toBe("283");
  });

  it("should throw on empty input", () => {
    expect(() => parseDecklistText("   ")).toThrow(ImportError);
  });

  it("should throw when no cards are detected", () => {
    expect(() => parseDecklistText("// Comentario\n# otro\n")).toThrow(ImportError);
  });

  it("should parse collection text grouping quantities by normalized name", () => {
    const text = `
      2 Sol Ring (C21) 263
      1 Sol Ring (CMR) 36x
    `;

    const collection = parseCollectionText(text);

    expect(collection).toHaveLength(1);
    expect(collection[0].name).toBe("Sol Ring");
    expect(collection[0].quantity).toBe(3);
  });
});
