import * as collection from "@/actions/collection";
import * as priorities from "@/actions/priorities";
import * as purchases from "@/actions/purchases";
import * as decks from "@/actions/decks";
import * as pricing from "@/actions/pricing";
import * as importActions from "@/actions/import";
import * as wants from "@/actions/wants";
import * as whatsappMatches from "@/actions/whatsapp-matches";
import * as simulated from "@/actions/simulated-collections";
import * as acquisitions from "@/actions/acquisitions";
import * as edhrec from "@/actions/edhrec";
import * as expansions from "@/actions/expansions";
import * as scryfall from "@/actions/scryfall";

/**
 * Read-only server functions the browser may call through /api/reads/[name].
 *
 * Server Actions are queued per client, so reading through them made a slow
 * request block every later action. Only reads belong here: mutations stay
 * Server Actions. Each function resolves the user from the session cookie.
 */
export const READS = {
  getCollectionQuery: collection.getCollectionQuery,
  getCollectionStats: collection.getCollectionStats,
  getDormantCards: collection.getDormantCards,
  getPriorities: priorities.getPriorities,
  getDeckValueHistory: purchases.getDeckValueHistory,
  getFunctionTargets: purchases.getFunctionTargets,
  getEdhrecCommanderRecommendations: decks.getEdhrecCommanderRecommendations,
  getDecksOverlap: decks.getDecksOverlap,
  getPriceMovers: pricing.getPriceMovers,
  getCollectionPriceHistory: pricing.getCollectionPriceHistory,
  getCardPriceHistory: pricing.getCardPriceHistory,
  getCollectionImportProgress: importActions.getCollectionImportProgress,
  getWantQuery: wants.getWantQuery,
  getWhatsAppMatches: whatsappMatches.getWhatsAppMatches,
  getDiscoveredOffers: simulated.getDiscoveredOffers,
  getSimulatedCollections: simulated.getSimulatedCollections,
  getSimulatedCollection: simulated.getSimulatedCollection,
  getPurchaseProvenance: acquisitions.getPurchaseProvenance,
  getDeckRecommendations: edhrec.getDeckRecommendations,
  getExpansionCards: expansions.getExpansionCards,
  getExpansions: expansions.getExpansions,
  getExpansionValueHistory: expansions.getExpansionValueHistory,
  searchCards: scryfall.searchCards,
  getCardNamed: scryfall.getCardNamed,
} as const;

export type ReadName = keyof typeof READS;
