import type { CardPrintingDetail } from "@/actions/scryfall";
import type { CardPriceQuote, PriceProvider, PriceSummary } from "@/lib/pricing";
import { normalizeCardName } from "@/lib/card-utils";

/** Build a listing quote from a selected printing's on-row prices. */
export function quoteFromPrinting(
  printing: CardPrintingDetail,
  cardName: string,
  quantity: number = 1,
  provider: PriceProvider = "cardmarket",
): CardPriceQuote | null {
  const trend =
    printing.trend ??
    printing.price_eur ??
    printing.cardtrader_trend ??
    null;
  if (trend == null || trend <= 0) return null;

  const min = printing.min ?? printing.price_eur ?? trend;
  const max = printing.max ?? printing.price_eur ?? trend;
  const currency = provider === "mtggoldfish" ? "USD" : "EUR";
  const currencySymbol = currency === "USD" ? "$" : "€";

  return {
    cardName,
    scryfallId: printing.id,
    provider,
    currency,
    currencySymbol,
    unitPrice: { trend, min: min ?? trend, max: max ?? trend },
    quantity,
    subtotal: trend * quantity,
    lastUpdated: new Date().toISOString(),
  };
}

/** Merge a printing quote into a PriceSummary, keyed by scryfall id and card name. */
export function injectPrintingQuote(
  summary: PriceSummary | null,
  printing: CardPrintingDetail,
  cardName: string,
  quantity: number = 1,
  provider: PriceProvider = "cardmarket",
  previousScryfallId?: string | null,
): PriceSummary | null {
  const quote = quoteFromPrinting(printing, cardName, quantity, provider);
  if (!quote) return summary;

  const base: PriceSummary = summary ?? {
    provider,
    currency: quote.currency,
    currencySymbol: quote.currencySymbol,
    totalCards: 0,
    totalNetValue: 0,
    quotes: {},
  };

  const quotes = { ...base.quotes };
  if (previousScryfallId && previousScryfallId !== printing.id) {
    delete quotes[previousScryfallId];
  }
  quotes[printing.id] = quote;
  quotes[normalizeCardName(cardName)] = quote;

  return { ...base, quotes };
}
