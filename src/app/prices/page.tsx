import { getPriceMovers } from "@/actions/pricing";
import { PriceHistoryView } from "@/components/price-history-view";
import type { PriceMoversResponse } from "@/lib/pricing/types";

export const dynamic = "force-dynamic";

async function loadMovers(
  scope: "global" | "collection"
): Promise<PriceMoversResponse | null> {
  try {
    return await getPriceMovers({
      provider: "cardmarket",
      windowDays: 30,
      limit: 20,
      scope,
    });
  } catch (err) {
    console.error(`Failed to load price movers (${scope}):`, err);
    return null;
  }
}

export default async function PricesPage() {
  const [initialMarket, initialCollection] = await Promise.all([
    loadMovers("global"),
    loadMovers("collection"),
  ]);

  return (
    <PriceHistoryView
      initialMarket={initialMarket}
      initialCollection={initialCollection}
    />
  );
}
