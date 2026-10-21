import { NextResponse } from "next/server";
import { getDeckPriceSummary, getCollectionPriceSummary, getCardsPriceSummary } from "@/actions/pricing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = "cardmarket";

    if (body.deckId) {
      const summary = await getDeckPriceSummary(body.deckId, provider);
      if (!summary) {
        return NextResponse.json({ error: "Deck not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, summary });
    }

    if (body.type === "collection") {
      const summary = await getCollectionPriceSummary(provider);
      return NextResponse.json({ success: true, summary });
    }

    if (Array.isArray(body.cards)) {
      const summary = await getCardsPriceSummary(body.cards, provider);
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: "Missing deckId, type=collection, or cards array" }, { status: 400 });
  } catch (error) {
    console.error("Price API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
