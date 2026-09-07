/**
 * Comprehensive Spanish MTG Dictionary and Text Formatter
 * Provides canonical translations for MTG types, formats, rarities, and rules text formatting.
 */

export const MTG_RARITY_ES: Record<string, string> = {
  common: "Común",
  uncommon: "Infrecuente",
  rare: "Rara",
  mythic: "Rara mítica",
  special: "Especial",
  bonus: "Bonus",
};

export function translateRarityEs(rarity?: string | null): string {
  if (!rarity) return "Común";
  const key = rarity.toLowerCase().trim();
  return MTG_RARITY_ES[key] || rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

export const MTG_FORMAT_NAMES_ES: Record<string, string> = {
  commander: "Commander / EDH",
  modern: "Modern",
  standard: "Estándar",
  pioneer: "Pioneer",
  legacy: "Legacy",
  vintage: "Vintage",
  pauper: "Pauper",
  brawl: "Brawl",
  historic: "Histórico",
  timeless: "Timeless",
  alchemy: "Alchemy",
  duel: "Duelo (1v1)",
  premodern: "Premodern",
  oathbreaker: "Oathbreaker",
  standardbrawl: "Brawl Estándar",
  paupercommander: "Pauper Commander",
};

export function translateFormatNameEs(format: string): string {
  const key = format.toLowerCase().trim();
  return MTG_FORMAT_NAMES_ES[key] || format.charAt(0).toUpperCase() + format.slice(1);
}

export const MTG_LEGALITY_STATUS_ES: Record<string, { label: string; color: "green" | "gray" | "red" | "amber" }> = {
  legal: { label: "Legal", color: "green" },
  not_legal: { label: "No legal", color: "gray" },
  banned: { label: "Prohibida", color: "red" },
  restricted: { label: "Restringida", color: "amber" },
};

export function translateLegalityStatusEs(status?: string | null): {
  label: string;
  color: "green" | "gray" | "red" | "amber";
} {
  if (!status) return { label: "Desconocido", color: "gray" };
  const key = status.toLowerCase().trim();
  return MTG_LEGALITY_STATUS_ES[key] || { label: status, color: "gray" };
}

const MAIN_TYPES_MAP: Record<string, string> = {
  Legendary: "Legendario/a",
  Basic: "Básica",
  Snow: "Nevada",
  World: "Mundo",
  Artifact: "Artefacto",
  Creature: "Criatura",
  Enchantment: "Encantamiento",
  Instant: "Instantáneo",
  Sorcery: "Conjuro",
  Land: "Tierra",
  Planeswalker: "Planeswalker",
  Battle: "Batalla",
  Kindred: "Familiar",
  Tribal: "Tribal",
};

const SUBTYPES_MAP: Record<string, string> = {
  // Lands
  Forest: "Bosque",
  Island: "Isla",
  Mountain: "Montaña",
  Plains: "Llanura",
  Swamp: "Pantano",
  // Common creature types
  Dragon: "Dragón",
  Elf: "Elfo",
  Goblin: "Trasgo",
  Human: "Humano",
  Knight: "Caballero",
  Wizard: "Hechicero",
  Angel: "Ángel",
  Demon: "Demonio",
  Zombie: "Zombi",
  Vampire: "Vampiro",
  Cleric: "Clérigo",
  Warrior: "Guerrero",
  Soldier: "Soldado",
  Rogue: "Bribón",
  Shaman: "Chamán",
  Druid: "Druida",
  Beast: "Bestia",
  Bird: "Ave",
  Cat: "Felino",
  Dog: "Perro",
  Fish: "Pez",
  Insect: "Insecto",
  Snake: "Serpiente",
  Spider: "Araña",
  Wolf: "Lobo",
  Wurm: "Sierpe",
  // Artifact & Enchantment subtypes
  Equipment: "Equipo",
  Aura: "Aura",
  Vehicle: "Vehículo",
  Saga: "Saga",
  Siege: "Asedio",
  Cartouche: "Cartucho",
  Curse: "Maldición",
  Rune: "Runa",
  Shrine: "Santuario",
  Class: "Clase",
};

export function translateTypeLineEs(typeLine?: string | null): string {
  if (!typeLine) return "Carta";

  // Check if it's dual-sided ("Front // Back")
  if (typeLine.includes(" // ")) {
    return typeLine
      .split(" // ")
      .map((part) => translateTypeLineEs(part))
      .join(" // ");
  }

  const parts = typeLine.split(" — ");
  let mainTypes = parts[0];
  const subtypes = parts[1];

  for (const [eng, esp] of Object.entries(MAIN_TYPES_MAP)) {
    const regex = new RegExp(`\\b${eng}\\b`, "g");
    mainTypes = mainTypes.replace(regex, esp);
  }

  if (subtypes) {
    const subWords = subtypes.split(" ");
    const translatedSubs = subWords.map((w) => SUBTYPES_MAP[w] || w);
    return `${mainTypes} — ${translatedSubs.join(" ")}`;
  }

  return mainTypes;
}

/**
 * Parses oracle/rules text and splits it into tokens of text and mana symbols (e.g. "{T}", "{2}{U}").
 */
export interface TextToken {
  type: "text" | "symbol";
  value: string;
}

export function parseRulesTextTokens(text: string): TextToken[] {
  if (!text) return [];

  const tokens: TextToken[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }
    tokens.push({
      type: "symbol",
      value: match[1],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}
