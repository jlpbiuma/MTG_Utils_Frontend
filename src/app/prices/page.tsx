import { getPriceMovers } from "@/actions/pricing";
import { PriceHistoryView } from "@/components/price-history-view";

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const [initialMarket, initialCollection] = await Promise.all([
    getPriceMovers({ provider: "cardmarket", windowDays: 30, limit: 20, scope: "global" }),
    getPriceMovers({ provider: "cardmarket", windowDays: 30, limit: 20, scope: "collection" }),
  ]);

  return (
    <PriceHistoryView
      initialMarket={initialMarket}
      initialCollection={initialCollection}
    />
  );
}
