import { DeckTabPage } from "../deck-tab-page";

export const dynamic = "force-dynamic";

export default async function DeckAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DeckTabPage params={params} tab="analytics_and_simulations" />;
}
