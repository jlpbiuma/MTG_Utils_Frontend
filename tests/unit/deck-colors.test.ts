import { describe, it, expect } from "vitest";
import {
  COLOR_GROUPS,
  extractColorsFromManaCost,
  buildColorIdentity,
  buildColorIdentityFromManaCosts,
  getColorGroupForIdentity,
  formatPrice,
  NO_COLOR_GROUP,
} from "@/lib/deck-colors";

describe("extractColorsFromManaCost", () => {
  it("returns empty for null/undefined/colorless costs", () => {
    expect(extractColorsFromManaCost()).toEqual([]);
    expect(extractColorsFromManaCost(null)).toEqual([]);
    expect(extractColorsFromManaCost("{1}")).toEqual([]);
    expect(extractColorsFromManaCost("{X}")).toEqual([]);
  });

  it("extracts colors in canonical WUBRG order", () => {
    expect(extractColorsFromManaCost("{2}{W}{U}")).toEqual(["W", "U"]);
    expect(extractColorsFromManaCost("{G}{R}{B}{U}{W}")).toEqual([
      "W",
      "U",
      "B",
      "R",
      "G",
    ]);
    expect(extractColorsFromManaCost("{R}")).toEqual(["R"]);
  });

  it("handles hybrid and phyrexian symbols", () => {
    expect(extractColorsFromManaCost("{W/U}")).toEqual(["W", "U"]);
    expect(extractColorsFromManaCost("{2/W}")).toEqual(["W"]);
    expect(extractColorsFromManaCost("{W/P}")).toEqual(["W"]);
    expect(extractColorsFromManaCost("{U/R}{B}")).toEqual(["U", "B", "R"]);
  });
});

describe("buildColorIdentity / buildColorIdentityFromManaCosts", () => {
  it("builds canonical identity keys", () => {
    expect(buildColorIdentity()).toBe("");
    expect(buildColorIdentity(["U", "W"])).toBe("WU");
    expect(buildColorIdentity(["B", "R", "G", "U", "W"])).toBe("WUBRG");
    expect(buildColorIdentityFromManaCosts(["{U}{W}", "{B}"])).toBe("WUB");
    expect(buildColorIdentityFromManaCosts([])).toBe("");
  });
});

describe("EDHREC-style color groups", () => {
  it("orders groups by number of colors: mono, 2, 3, 4, penta", () => {
    const sizes = [...new Set(COLOR_GROUPS.map((g) => g.numColors))];
    expect(sizes).toEqual([1, 2, 3, 4, 5]);

    // Counts: 5 mono + 10 two + 10 three + 5 four + 1 penta = 31
    expect(COLOR_GROUPS).toHaveLength(31);
  });

  it("uses EDHREC-style localized labels", () => {
    const label = (id: string) => getColorGroupForIdentity(id).label;
    expect(label("U")).toBe("Mono-Azul");
    expect(label("G")).toBe("Mono-Verde");
    expect(label("WU")).toBe("Azorius");
    expect(label("UR")).toBe("Izzet");
    expect(label("WB")).toBe("Orzhov");
    expect(label("GW")).toBe("Selesnya");
    expect(label("BR")).toBe("Rakdos");
    expect(label("GWU")).toBe("Bant");
    expect(label("BRG")).toBe("Jund");
    expect(label("UBR")).toBe("Grixis");
    expect(label("WURG")).toBe("Sans-Negro");
    expect(label("WBRG")).toBe("Sans-Azul");
    expect(label("WUBRG")).toBe("Penta (5 Colores)");
  });

  it("falls back to the no-color group for unknown identities", () => {
    const fallback = getColorGroupForIdentity("QWER");
    expect(fallback).toEqual(NO_COLOR_GROUP);
    expect(getColorGroupForIdentity("").label).toBe("Sin Colores");
  });
});

describe("formatPrice", () => {
  it("formats with currency symbol using es-ES convention", () => {
    expect(formatPrice(125.406, "€")).toBe("125.41 €");
    expect(formatPrice(null, "€")).toBe("—");
    expect(formatPrice(undefined, "€")).toBe("—");
  });
});