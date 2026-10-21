import type { WhatsAppDealMatch } from "@/actions/whatsapp-matches";

export type OpportunitySelection = Record<string, number>;
export function opportunityKey(match: WhatsAppDealMatch) {
  return JSON.stringify([match.subject, match.whatsapp_url, match.id]);
}
export function tradeQuantity(match: WhatsAppDealMatch) {
  if (match.trade_quantity != null) return Math.max(0, Math.floor(match.trade_quantity));
  const wanted = match.matched_want?.quantity_wanted ?? match.matched_collection?.available_quantity ?? 0;
  const listed = match.extra.quantity;
  return Math.max(0, Math.floor(typeof listed === "number" && Number.isFinite(listed) ? Math.min(wanted, listed) : wanted));
}
export function selectedQuantity(match: WhatsAppDealMatch, selection: OpportunitySelection) {
  const value = selection[opportunityKey(match)] ?? tradeQuantity(match);
  return Number.isFinite(value) ? Math.min(tradeQuantity(match), Math.max(0, Math.floor(value))) : 0;
}
export function opportunityPrice(match: WhatsAppDealMatch) {
  const candidates = [match.unit_price, match.price, match.extra.reference_price];
  for (const value of candidates) {
    if (value == null || value === "") continue;
    const price = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
    if (Number.isFinite(price) && price >= 0) return price;
  }
  return null;
}
export function priceCurrency(match: WhatsAppDealMatch) {
  const currency = match.price_currency || match.currency || "EUR";
  return currency === "€" ? "EUR" : currency === "$" ? "USD" : currency.toUpperCase();
}
export function formatOpportunityValue(amount: number, currency: string) {
  try { return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}
export function selectionValue(matches: WhatsAppDealMatch[], selection: OpportunitySelection, metric: "purchase" | "trend" = "purchase") {
  const totals: Record<string, number> = {};
  let missingPrices = 0;
  let copies = 0;
  for (const match of matches) {
    const quantity = selectedQuantity(match, selection);
    if (!quantity) continue;
    copies += quantity;
    const price = metric === "trend" ? match.trend_unit_price ?? null : opportunityPrice(match);
    if (price === null) { missingPrices += quantity; continue; }
    const currency = metric === "trend" ? "EUR" : priceCurrency(match);
    // Add rounded cents to avoid accumulated floating point money errors.
    totals[currency] = (totals[currency] ?? 0) + Math.round(price * quantity * 100);
  }
  return { copies, missingPrices, totals: Object.fromEntries(Object.entries(totals).map(([currency, cents]) => [currency, cents / 100])) };
}
export function selectionList(matches: WhatsAppDealMatch[], selection: OpportunitySelection) {
  return matches.flatMap((match) => {
    const quantity = selectedQuantity(match, selection);
    return quantity ? [{ cardName: match.card_name, quantity }] : [];
  });
}

/** Like Golden Wants, global completion is the average over every active deck. */
export function selectionCompletion(matches: WhatsAppDealMatch[], selection: OpportunitySelection, deckCount: number, before: number) {
  const byName = new Map<string, { quantity: number; match: WhatsAppDealMatch }>();
  for (const match of matches) {
    if (match.subject !== "vende") continue;
    const quantity = selectedQuantity(match, selection);
    if (!quantity) continue;
    const previous = byName.get(match.normalized_name);
    byName.set(match.normalized_name, { quantity: quantity + (previous?.quantity ?? 0), match });
  }
  const decks = new Map<string, { total: number; owned: number; added: number }>();
  for (const { quantity, match } of byName.values()) {
    for (const impact of match.completion_requirements ?? []) {
      const oldOwned = Number(impact.assigned_quantity > 0 || impact.collection_quantity > 0);
      const newOwned = Number(oldOwned > 0 || quantity > 0);
      const deck = decks.get(impact.deck_id) ?? { total: impact.total_cards, owned: impact.owned_cards, added: 0 };
      deck.added += newOwned - oldOwned;
      decks.set(impact.deck_id, deck);
    }
  }
  const gain = deckCount ? [...decks.values()].reduce((sum, deck) => sum +
    (Math.round((deck.owned + deck.added) / deck.total * 1000) - Math.round(deck.owned / deck.total * 1000)) / 10, 0) / deckCount : 0;
  return { before, after: Math.min(100, before + gain), gain };
}
