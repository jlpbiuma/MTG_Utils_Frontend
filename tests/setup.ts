import "@testing-library/jest-dom/vitest";
import { vi, afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => { window.history.replaceState(null, "", "/decks"); });

// Automatically cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js navigation
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/decks",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock Next.js cache revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock Next.js headers / cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "00000000-0000-0000-0000-000000000001" }),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Browser reads go through /api/reads in the app. Tests keep mocking the
// actions modules, so each read wrapper forwards to its (possibly mocked) action.
vi.mock("@/lib/reads", () => {
  const modules: Record<string, () => Promise<Record<string, unknown>>> = {
    collection: () => import("@/actions/collection"),
    priorities: () => import("@/actions/priorities"),
    purchases: () => import("@/actions/purchases"),
    decks: () => import("@/actions/decks"),
    pricing: () => import("@/actions/pricing"),
    import: () => import("@/actions/import"),
    wants: () => import("@/actions/wants"),
    "whatsapp-matches": () => import("@/actions/whatsapp-matches"),
    "simulated-collections": () => import("@/actions/simulated-collections"),
    acquisitions: () => import("@/actions/acquisitions"),
    edhrec: () => import("@/actions/edhrec"),
    expansions: () => import("@/actions/expansions"),
    scryfall: () => import("@/actions/scryfall"),
  };
  const owners: Record<string, string> = {
    getCollectionQuery: "collection", getCollectionStats: "collection", getDormantCards: "collection",
    getPriorities: "priorities", getDeckValueHistory: "purchases", getFunctionTargets: "purchases",
    getEdhrecCommanderRecommendations: "decks", getDecksOverlap: "decks",
    getPriceMovers: "pricing", getCollectionPriceHistory: "pricing", getCardPriceHistory: "pricing",
    getCollectionImportProgress: "import", getWantQuery: "wants", getWhatsAppMatches: "whatsapp-matches",
    getDiscoveredOffers: "simulated-collections", getSimulatedCollections: "simulated-collections",
    getSimulatedCollection: "simulated-collections", getPurchaseProvenance: "acquisitions",
    getDeckRecommendations: "edhrec", getExpansionCards: "expansions", getExpansions: "expansions",
    getExpansionValueHistory: "expansions", searchCards: "scryfall", getCardNamed: "scryfall",
  };
  return Object.fromEntries(Object.entries(owners).map(([name, owner]) => [
    name,
    async (...args: unknown[]) => {
      const mod = await modules[owner]();
      return (mod[name] as (...values: unknown[]) => unknown)(...args);
    },
  ]));
});
