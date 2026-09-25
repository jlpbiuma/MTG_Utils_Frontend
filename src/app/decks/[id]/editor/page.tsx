import { DeckTabPage } from "../deck-tab-page";

export const dynamic = "force-dynamic";

export default async function DeckEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DeckTabPage params={params} tab="editor" />;
}
