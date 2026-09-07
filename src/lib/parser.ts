import { normalizeCardName } from "@/lib/card-utils";

export class ImportError extends Error {
  code: "emptyInput" | "noCardsDetected";

  constructor(code: "emptyInput" | "noCardsDetected", message?: string) {
    super(
      message ||
        (code === "emptyInput"
          ? "El texto está vacío."
          : "No se detectaron cartas. Comprueba el formato.")
    );
    this.name = "ImportError";
    this.code = code;
    Object.setPrototypeOf(this, ImportError.prototype);
  }
}

export interface ParsedCardLine {
  quantity: number;
  name: string;
  set?: string;
  collectorNumber?: string;
  isSideboard: boolean;
}

export interface ParsedCollectionLine {
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
}

/**
 * Parses a single MTG card line extracting quantity, clean name, set code and collector number.
 * Supports Moxfield/Archidekt, MTG Arena, alphanumeric collector numbers (e.g. 191p, 360s *F*, E02-3),
 * and bracket set tags [SET:123].
 */
export function parseSingleCardLine(rawLine: string): {
  quantity: number;
  name: string;
  set?: string;
  collectorNumber?: string;
} | null {
  let cardText = rawLine.trim();
  if (!cardText || cardText.startsWith("//") || cardText.startsWith("#")) return null;

  // Extract quantity (e.g. "4 ", "4x ", "1 ", or default 1)
  let quantity = 1;
  const qtyMatch = cardText.match(/^(\d+)(?:x|\s)\s*(.*)$/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10) || 1;
    cardText = qtyMatch[2].trim();
  }

  // Clean up trailing tags like *F*, *E*, *Foil*, etc.
  cardText = cardText.replace(/\s*\*[A-Za-z0-9]+\*\s*$/g, "").trim();

  // Extract set code and collector number if present: `(2XM) 198`, `(CLB) 12`, `(LCC) 191p`, `(PCLB) 360s`
  let set: string | undefined;
  let collectorNumber: string | undefined;

  const setMatch = cardText.match(/\(([A-Za-z0-9_]{3,6})\)\s*([A-Za-z0-9\-pP]+)?$/i);
  if (setMatch) {
    set = setMatch[1].toLowerCase();
    collectorNumber = setMatch[2]?.trim();
    cardText = cardText.replace(/\(([A-Za-z0-9_]{3,6})\)\s*([A-Za-z0-9\-pP]+)?$/i, "").trim();
  }

  // Fallback: [SET:123] format e.g. [ANA:1]
  const altSetMatch = cardText.match(/\[([A-Za-z0-9_]{3,6}):([A-Za-z0-9\-pP]+)\]$/i);
  if (altSetMatch) {
    set = altSetMatch[1].toLowerCase();
    collectorNumber = altSetMatch[2]?.trim();
    cardText = cardText.replace(/\[([A-Za-z0-9_]{3,6}):([A-Za-z0-9\-pP]+)\]$/i, "").trim();
  }

  if (cardText.length === 0) return null;

  return {
    quantity,
    name: cardText,
    set,
    collectorNumber,
  };
}

/**
 * Parses decklists in standard MTG formats:
 * - Moxfield export format: `1 Atraxa, Praetors' Voice (2XM) 198 *F*`
 * - MTG Arena format: `Deck`, `4 Lightning Bolt (CLB) 123`, `Sideboard`, `1 Force of Will`
 * - Plaintext format: `4x Lightning Bolt`, `1 Sol Ring`
 * - Sideboard lines: `SB: 1 Card` or under `// Sideboard`, `Sideboard:`, etc.
 * Throws ImportError on empty input or no detected cards when throwOnError is true (default).
 */
export function parseDecklistText(
  rawText: string,
  options: { throwOnError?: boolean } = { throwOnError: true }
): ParsedCardLine[] {
  const trimmed = rawText.trim();
  if (!trimmed) {
    if (options.throwOnError) {
      throw new ImportError("emptyInput");
    }
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const parsedCards: ParsedCardLine[] = [];
  let inSideboard = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for section headers
    const lower = line.toLowerCase();
    if (
      lower.startsWith("// sideboard") ||
      lower.startsWith("sideboard") ||
      lower.startsWith("//sideboard") ||
      lower === "sideboard:"
    ) {
      inSideboard = true;
      continue;
    }

    if (
      lower.startsWith("// main") ||
      lower.startsWith("deck") ||
      lower.startsWith("// deck") ||
      lower.startsWith("// commander") ||
      lower.startsWith("commander")
    ) {
      inSideboard = false;
      continue;
    }

    // Ignore other commentary lines starting with // or #
    if (line.startsWith("//") || line.startsWith("#")) {
      continue;
    }

    let isSideboardCard = inSideboard;
    let cardText = line;

    // Check for "SB: 1 Card Name" format
    if (/^sb:\s*/i.test(cardText)) {
      isSideboardCard = true;
      cardText = cardText.replace(/^sb:\s*/i, "").trim();
    }

    const parsed = parseSingleCardLine(cardText);
    if (parsed) {
      parsedCards.push({
        ...parsed,
        isSideboard: isSideboardCard,
      });
    }
  }

  if (parsedCards.length === 0 && options.throwOnError) {
    throw new ImportError("noCardsDetected");
  }

  return parsedCards;
}

/**
 * Parses collection text where multiple lines for the same card are grouped
 * and their quantities consolidated by normalized card name (matching Swift CardParser.swift).
 * Throws ImportError on empty input or no detected cards when throwOnError is true (default).
 */
export function parseCollectionText(
  rawText: string,
  options: { throwOnError?: boolean } = { throwOnError: true }
): ParsedCollectionLine[] {
  const trimmed = rawText.trim();
  if (!trimmed) {
    if (options.throwOnError) {
      throw new ImportError("emptyInput");
    }
    return [];
  }

  const lines = rawText.split(/\r?\n/);
  const result = new Map<string, ParsedCollectionLine>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    const parsed = parseSingleCardLine(line);
    if (!parsed) continue;

    const key = normalizeCardName(parsed.name);
    const existing = result.get(key);
    if (existing) {
      existing.quantity += parsed.quantity;
    } else {
      result.set(key, {
        quantity: parsed.quantity,
        name: parsed.name,
        setCode: parsed.set,
        collectorNumber: parsed.collectorNumber,
      });
    }
  }

  if (result.size === 0 && options.throwOnError) {
    throw new ImportError("noCardsDetected");
  }

  return Array.from(result.values());
}
