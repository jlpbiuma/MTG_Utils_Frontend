/**
 * Browser-side reads through /api/reads/[name] instead of Server Actions.
 *
 * Server Actions run one at a time per client: a slow read used to hold every
 * later click (saving, deleting, paging) until it finished. These wrappers
 * keep the same names and signatures as the actions, run in parallel, and are
 * only for reads; keep mutations as Server Actions.
 */
import type { READS, ReadName } from "@/lib/read-registry";

type ReadFn<K extends ReadName> = (typeof READS)[K];

async function callRead<K extends ReadName>(name: K, args: unknown[]): Promise<Awaited<ReturnType<ReadFn<K>>>> {
  const res = await fetch(`/api/reads/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `La lectura ${name} falló (${res.status})`);
  return (body?.result ?? undefined) as Awaited<ReturnType<ReadFn<K>>>;
}

function read<K extends ReadName>(name: K) {
  return ((...args: Parameters<ReadFn<K>>) => callRead(name, args)) as unknown as ReadFn<K>;
}

export const getCollectionQuery = read("getCollectionQuery");
export const getCollectionStats = read("getCollectionStats");
export const getDormantCards = read("getDormantCards");
export const getPriorities = read("getPriorities");
export const getDeckValueHistory = read("getDeckValueHistory");
export const getFunctionTargets = read("getFunctionTargets");
export const getEdhrecCommanderRecommendations = read("getEdhrecCommanderRecommendations");
export const getDecksOverlap = read("getDecksOverlap");
export const getPriceMovers = read("getPriceMovers");
export const getCollectionPriceHistory = read("getCollectionPriceHistory");
export const getCardPriceHistory = read("getCardPriceHistory");
export const getCollectionImportProgress = read("getCollectionImportProgress");
export const getWantQuery = read("getWantQuery");
export const getWhatsAppMatches = read("getWhatsAppMatches");
export const getDiscoveredOffers = read("getDiscoveredOffers");
export const getSimulatedCollections = read("getSimulatedCollections");
export const getSimulatedCollection = read("getSimulatedCollection");
export const getPurchaseProvenance = read("getPurchaseProvenance");
export const getDeckRecommendations = read("getDeckRecommendations");
export const getExpansionCards = read("getExpansionCards");
export const getExpansions = read("getExpansions");
export const getExpansionValueHistory = read("getExpansionValueHistory");
export const searchCards = read("searchCards");
export const getCardNamed = read("getCardNamed");
