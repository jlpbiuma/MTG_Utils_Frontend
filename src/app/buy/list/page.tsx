import { getWantStats, getWantQuery } from "@/actions/wants";
import { WantsView } from "@/components/wants-view";

export const dynamic = "force-dynamic";

export default async function WantsPage() {
  const [stats, initialView] = await Promise.all([
    getWantStats(),
    getWantQuery(),
  ]);

  return <WantsView initialStats={stats} initialView={initialView} />;
}
