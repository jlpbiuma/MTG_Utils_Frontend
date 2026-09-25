import { describe, it, expect } from "vitest";
import { injectPrintingQuote, quoteFromPrinting } from "@/lib/printing-quote";
import type { CardPrintingDetail } from "@/actions/scryfall";
import type { PriceSummary } from "@/lib/pricing";

const printing: CardPrintingDetail = {
  id: "print-premium",
  set_code: "fic",
  collector_number: "202",
  trend: 45.0,
  min: 40.0,
  max: 50.0,
  image_uri: "https://example.com/premium.jpg",
};

describe("printing-quote helpers", () => {
  it("builds a quote from a printing with positive trend", () => {
    const quote = quoteFromPrinting(printing, "Terra", 2);
    expect(quote).not.toBeNull();
    expect(quote!.scryfallId).toBe("print-premium");
    expect(quote!.unitPrice.trend).toBe(45);
    expect(quote!.subtotal).toBe(90);
  });

  it("injects quote into summary keyed by id and normalized name", () => {
    const summary: PriceSummary = {
      provider: "cardmarket",
      currency: "EUR",
      currencySymbol: "€",
      totalCards: 1,
      totalNetValue: 15,
      quotes: {
        "print-old": {
          cardName: "Terra",
          scryfallId: "print-old",
          provider: "cardmarket",
          currency: "EUR",
          currencySymbol: "€",
          unitPrice: { trend: 15, min: 10, max: 20 },
          quantity: 1,
          subtotal: 15,
          lastUpdated: new Date().toISOString(),
        },
      },
    };

    const next = injectPrintingQuote(summary, printing, "Terra", 1, "cardmarket", "print-old");
    expect(next).not.toBeNull();
    expect(next!.quotes["print-premium"]?.unitPrice.trend).toBe(45);
    expect(next!.quotes["terra"]?.unitPrice.trend).toBe(45);
    expect(next!.quotes["print-old"]).toBeUndefined();
  });
});
