import { getCollectionQuery, getCollectionStats } from "@/actions/collection";
import { getUserDecks } from "@/actions/decks";
import { CollectionView } from "@/components/collection-view";

export const dynamic = "force-dynamic";

export default async function CollectionInventoryPage() {
  const [initialView, stats, decks] = await Promise.all([
    getCollectionQuery({
      sort: "name",
      direction: "asc",
      grouped: false,
      priceProvider: "cardmarket",
      page: 1,
      limit: 200,
    }),
    getCollectionStats(),
    getUserDecks().catch(() => []),
  ]);

  return (
    <CollectionView
      activeTab="inventory"
      initialView={initialView}
      initialStats={{
        ...stats,
        decksCount: Array.isArray(decks) ? decks.length : 0,
      }}
    />
  );
}
