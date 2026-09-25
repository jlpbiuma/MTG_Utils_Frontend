import { DeckTabPage } from "../deck-tab-page";

export const dynamic = "force-dynamic";

export default async function DeckEdhrecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DeckTabPage params={params} tab="edhrec" />;
}
