/**
 * Pure utilities for MTG deck color identity: extraction from mana costs,
 * canonical EDHREC-style grouping by identity and number of colors, and
 * localized group labels. Safe for client and server environments.
 */

export const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

export type ManaColor = (typeof COLOR_ORDER)[number];

/**
 * Returns the WUBRG colors present in a mana cost string such as "{2}{W}{U}".
 * Hybrid symbols ({W/U}, {2/W}, {W/P}...) contribute every color they contain.
 * Colors are returned in canonical WUBRG order.
 */
export function extractColorsFromManaCost(
  manaCost?: string | null
): ManaColor[] {
  if (!manaCost) return [];
  const found = new Set<ManaColor>();
  const symbols = manaCost.match(/\{([^}]+)\}/g) || [];
  for (const sym of symbols) {
    const inner = sym.replace(/[{}]/g, "").toUpperCase();
    if ((COLOR_ORDER as readonly string[]).includes(inner)) {
      found.add(inner as ManaColor);
      continue;
    }
    // Hybrid / Phyrexian symbols like {W/U}, {2/W} or {W/P}.
    for (const color of COLOR_ORDER) {
      if (inner.includes(color)) found.add(color);
    }
  }
  return COLOR_ORDER.filter((c) => found.has(c));
}

/** Canonical color identity key (e.g. "WU") from an array of colors. */
export function buildColorIdentity(colors?: string[]): string {
  if (!colors || colors.length === 0) return "";
  return COLOR_ORDER.filter((c) => colors.includes(c)).join("");
}

/** Union color identity of arbitrary mana cost strings, ordered WUBRG. */
export function buildColorIdentityFromManaCosts(
  manaCosts?:(string | null)[]
): string {
  const set = new Set<ManaColor>();
  (manaCosts || []).forEach((cost) => {
    extractColorsFromManaCost(cost).forEach((c) => set.add(c));
  });
  return COLOR_ORDER.filter((c) => set.has(c)).join("");
}

export interface ColorGroupInfo {
  /** Canonical sorted identity, e.g. "WU". */
  identity: string;
  numColors: number;
  /** Localized group label, e.g. "Azorius" or "Mono-Azul". */
  label: string;
  /** Colors present in the identity, for rendering pips. */
  manaColors: ManaColor[];
  order: number;
}

const monoGroups = [
  { identity: "W", label: "Mono-Blanco" },
  { identity: "U", label: "Mono-Azul" },
  { identity: "B", label: "Mono-Negro" },
  { identity: "R", label: "Mono-Rojo" },
  { identity: "G", label: "Mono-Verde" },
];

const twoColorGroups = [
  { identity: "WU", label: "Azorius" },
  { identity: "UB", label: "Dimir" },
  { identity: "BR", label: "Rakdos" },
  { identity: "RG", label: "Gruul" },
  { identity: "GW", label: "Selesnya" },
  { identity: "WB", label: "Orzhov" },
  { identity: "UR", label: "Izzet" },
  { identity: "BG", label: "Golgari" },
  { identity: "WR", label: "Boros" },
  { identity: "UG", label: "Simic" },
];

const threeColorGroups = [
  { identity: "WUB", label: "Esper" },
  { identity: "UBR", label: "Grixis" },
  { identity: "BRG", label: "Jund" },
  { identity: "RGW", label: "Naya" },
  { identity: "GWU", label: "Bant" },
  { identity: "WBG", label: "Abzan" },
  { identity: "URW", label: "Jeskai" },
  { identity: "BGU", label: "Sultai" },
  { identity: "RWB", label: "Mardu" },
  { identity: "GUR", label: "Temur" },
];

const fourColorGroups = [
  { identity: "UBRG", label: "Sans-Blanco" },
  { identity: "WBRG", label: "Sans-Azul" },
  { identity: "WURG", label: "Sans-Negro" },
  { identity: "WUBG", label: "Sans-Rojo" },
  { identity: "WUBR", label: "Sans-Verde" },
];

const fiveColorGroups = [{ identity: "WUBRG", label: "Penta (5 Colores)" }];

function toGroupInfo(
  groups: { identity: string; label: string }[],
  orderStart: number
): ColorGroupInfo[] {
  return groups.map((g, i) => ({
    identity: g.identity,
    numColors: g.identity.length,
    label: g.label,
    manaColors: g.identity.split("") as ManaColor[],
    order: orderStart + i,
  }));
}

/** EDHREC-style color identity groups, ordered by number of colors. */
export const COLOR_GROUPS: ColorGroupInfo[] = [
  ...toGroupInfo(monoGroups, 0),
  ...toGroupInfo(twoColorGroups, 10),
  ...toGroupInfo(threeColorGroups, 20),
  ...toGroupInfo(fourColorGroups, 30),
  ...toGroupInfo(fiveColorGroups, 35),
];

export const COLOR_IDENTITY_TO_GROUP: Record<string, ColorGroupInfo> =
  Object.fromEntries(COLOR_GROUPS.map((g) => [g.identity, g]));

/** Fallback group for decks without a resolvable color identity. */
export const NO_COLOR_GROUP: ColorGroupInfo = {
  identity: "",
  numColors: 0,
  label: "Sin Colores",
  manaColors: [],
  order: 99,
};

export function getColorGroupForIdentity(
  identity?: string | null
): ColorGroupInfo {
  return COLOR_IDENTITY_TO_GROUP[identity || ""] || NO_COLOR_GROUP;
}

/** Formats a price value with a currency symbol using es-ES locale. */
export function formatPrice(
  value?: number | null,
  symbol?: string | null
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)} ${symbol || "€"}`;
}