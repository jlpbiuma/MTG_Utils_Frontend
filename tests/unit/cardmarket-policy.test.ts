import { beforeEach, expect, it, vi } from "vitest";
import { backendFetch } from "@/lib/api-client";
import { getDeckPriceSummary, getCardsPriceSummary, getCollectionPriceSummary, getPriceMovers, getCardPriceHistory, getCollectionPriceHistory } from "@/actions/pricing";
import { getPriorities, getGoldenWants } from "@/actions/priorities";
import { getCollectionQuery } from "@/actions/collection";
import { getWantQuery } from "@/actions/wants";
import { getUserDecks, getDeckDetail } from "@/actions/decks";
import { analyzeRawSimulatedCollection, getSimulatedCollection } from "@/actions/simulated-collections";
import { getPriceSummary } from "@/lib/pricing";
import { quoteFromPrinting } from "@/lib/printing-quote";

vi.mock("@/lib/api-client", () => ({ backendFetch: vi.fn().mockResolvedValue({}) }));
vi.mock("@/actions/auth", () => ({ getCurrentUserId: vi.fn().mockResolvedValue("user") }));
beforeEach(() => vi.clearAllMocks());

it("uses Cardmarket in every pricing request even when a legacy provider is supplied", async () => {
  await getDeckPriceSummary("deck", "cardtrader");
  await getCardsPriceSummary([], "mtggoldfish");
  await getCollectionPriceSummary("mtggoldfish");
  await getPriceMovers({provider:"cardtrader"});
  await getCardPriceHistory("card", "mtggoldfish", 90);
  await getCollectionPriceHistory("cardtrader", 7);
  await getPriorities({provider:"mtggoldfish"});
  await getGoldenWants({provider:"cardtrader"});
  await getCollectionQuery({priceProvider:"mtggoldfish"});
  await getWantQuery({priceProvider:"cardtrader"});
  await getUserDecks();
  await getDeckDetail("deck");
  await analyzeRawSimulatedCollection("1 Sol Ring", "mtggoldfish");
  await getSimulatedCollection("offer", "cardtrader");
  expect(backendFetch).toHaveBeenCalledTimes(14);
  for (const [path, options] of vi.mocked(backendFetch).mock.calls) {
    const params=new URL(path, "http://localhost").searchParams;
    const body=options?.body ? JSON.parse(String(options.body)) : {};
    expect(params.get("provider") ?? params.get("priceProvider") ?? body.provider).toBe("cardmarket");
    expect(`${path} ${options?.body ?? ""}`).not.toMatch(/cardtrader|mtggoldfish/);
  }
});

it("keeps locally generated quotes in Cardmarket EUR and does not borrow Card Trader prices", async () => {
  const summary=await getPriceSummary([], "mtggoldfish");
  expect(summary).toMatchObject({provider:"cardmarket",currency:"EUR",currencySymbol:"€"});
  const quote=quoteFromPrinting({id:"printing",set_code:"set",collector_number:"1",trend:12,cardtrader_trend:99}, "Card", 2, "mtggoldfish");
  expect(quote).toMatchObject({provider:"cardmarket",currency:"EUR",currencySymbol:"€",subtotal:24});
  expect(quoteFromPrinting({id:"printing",set_code:"set",collector_number:"1",cardtrader_trend:99}, "Card")).toBeNull();
});
