import { getCollectionQuery, getCollectionStats } from "@/actions/collection";
import { getUserDecks } from "@/actions/decks";
import { CollectionView } from "@/components/collection-view";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [initialView, stats, decks] = await Promise.all([
    getCollectionQuery({ sort: "name", direction: "asc", grouped: false, priceProvider: "cardmarket" }),
    getCollectionStats(),
    getUserDecks().catch(() => []),
  ]);

  return (
    <CollectionView
      initialView={initialView}
      initialStats={{
        ...stats,
        decksCount: Array.isArray(decks) ? decks.length : 0,
      }}
    />
  );
}
