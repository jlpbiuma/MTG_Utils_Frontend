import { getCollectionQuery, getCollectionStats } from "@/actions/collection";
import { CollectionView } from "@/components/collection-view";
import { COLLECTION_PAGE_SIZE } from "@/lib/page-sizes";

export const dynamic = "force-dynamic";

export default async function CollectionInventoryPage() {
  // The deck count comes with the stats: loading every deck summary just to
  // count them recalculated prices and completion for the whole account.
  const [initialView, stats] = await Promise.all([
    getCollectionQuery({
      sort: "name",
      direction: "asc",
      grouped: false,
      priceProvider: "cardmarket",
      page: 1,
      limit: COLLECTION_PAGE_SIZE,
    }),
    getCollectionStats(),
  ]);

  return (
    <CollectionView
      activeTab="inventory"
      initialView={initialView}
      initialStats={stats}
    />
  );
}
