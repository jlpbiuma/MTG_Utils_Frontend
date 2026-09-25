import { notFound } from "next/navigation";
import { getDeckDetail } from "@/actions/decks";
import { DeckDetailView } from "@/components/deck-detail-view";

export type DeckTab = "cards" | "editor" | "analytics_and_simulations" | "edhrec";

interface DeckTabPageProps {
  params: Promise<{ id: string }>;
  tab: DeckTab;
}

export const dynamic = "force-dynamic";

export async function DeckTabPage({ params, tab }: DeckTabPageProps) {
  const { id } = await params;
  const deck = await getDeckDetail(id);
  if (!deck) notFound();
  return <DeckDetailView initialDeck={deck} initialTab={tab} />;
}
