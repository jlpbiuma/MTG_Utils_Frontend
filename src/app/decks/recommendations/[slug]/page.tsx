import { notFound } from "next/navigation";
import { getRecommendedDeck } from "@/actions/edhrec";
import { DeckDetailView } from "@/components/deck-detail-view";

export const dynamic = "force-dynamic";

export default async function RecommendedDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const deck = await getRecommendedDeck(slug);
  if (!deck) notFound();
  return <DeckDetailView initialDeck={deck} recommendation={deck} />;
}
