import { getCollectionStats } from "@/actions/collection";
import { getUserDecks } from "@/actions/decks";
import { CollectionView } from "@/components/collection-view";

export const dynamic = "force-dynamic";

export default async function CollectionDormantPage() {
  const [stats, decks] = await Promise.all([
    getCollectionStats(),
    getUserDecks().catch(() => []),
  ]);

  return (
    <CollectionView
      activeTab="dormant"
      initialStats={{
        ...stats,
        decksCount: Array.isArray(decks) ? decks.length : 0,
      }}
    />
  );
}
