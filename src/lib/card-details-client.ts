import type { SpanishCardDetails } from "@/actions/scryfall";
export type { SpanishCardDetails, SpanishCardFace, CardPrintingDetail } from "@/actions/scryfall";

const TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 50;
export const cardDetailsClientCache = new Map<string, { expiresAt: number; card: SpanishCardDetails }>();
const pending = new Map<string, Promise<SpanishCardDetails | null>>();

export function getCardDetails(params: { id?: string; name?: string; set?: string; collector_number?: string }): Promise<SpanishCardDetails | null> {
  // Details contain every printing; selecting another edition reuses the same catalog.
  const key = params.name?.trim().toLowerCase() || params.id || "";
  if (!key) return Promise.resolve(null);
  const cached = cardDetailsClientCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.card);
  const inflight = pending.get(key);
  if (inflight) return inflight;
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) if (value) query.set(name, value);
  const request = (async () => {
    const response = await fetch(`/api/scryfall/card?${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el detalle de la carta.");
    const card = await response.json() as SpanishCardDetails | null;
    if (card?.id) {
      cardDetailsClientCache.delete(key);
      while (cardDetailsClientCache.size >= MAX_ENTRIES) cardDetailsClientCache.delete(cardDetailsClientCache.keys().next().value!);
      cardDetailsClientCache.set(key, { expiresAt: Date.now() + TTL_MS, card });
    }
    return card;
  })();
  pending.set(key, request);
  void request.then(() => pending.delete(key), () => pending.delete(key));
  return request;
}
