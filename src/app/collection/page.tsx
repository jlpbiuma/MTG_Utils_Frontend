import { getUserCollection, getCollectionStats } from "@/actions/collection";
import { getUserDecks } from "@/actions/decks";
import { CollectionView } from "@/components/collection-view";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  const [cards, stats, decks] = await Promise.all([
    getUserCollection({ limit: 9, offset: 0 }),
    getCollectionStats(),
    getUserDecks().catch(() => []),
  ]);

  return (
    <CollectionView
      initialCards={cards}
      initialStats={{
        ...stats,
        decksCount: Array.isArray(decks) ? decks.length : 0,
      }}
    />
  );
}

