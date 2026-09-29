import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EdhrecRecommendations } from "@/components/edhrec-recommendations";
import { getDeckRecommendations } from "@/actions/edhrec";

vi.mock("@/actions/edhrec", () => ({
  getDeckRecommendations: vi.fn(),
}));

vi.mock("@/components/card-image", () => ({
  CardImage: ({ alt }: { alt?: string }) => <div>{alt}</div>,
}));

describe("EDHREC sideboard indicator", () => {
  beforeEach(() => {
    vi.mocked(getDeckRecommendations).mockResolvedValue({
      commander: { name: "Tidus", numDecks: 100 },
      categories: ["Creatures"],
      recommendations: [
        {
          id: "sol-ring-printing",
          name: "Sol Ring",
          normalizedName: "sol ring",
          sanitized: "sol-ring",
          category: "Creatures",
          categories: ["Creatures"],
          numDecks: 100,
          potentialDecks: 100,
          inclusionPct: 100,
          synergy: 0,
          imageUri: null,
          isInDeck: true,
          isInCollection: true,
          collectionQuantity: 1,
          requestedInDecks: [
            { deckId: "deck-a", deckName: "Tidus", quantity: 1, isSideboard: true },
          ],
        },
      ],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  });

  it("marks a recommended card as sideboard when it is requested there", async () => {
    render(
      <EdhrecRecommendations
        deckId="deck-a"
        deckName="Tidus"
        commander="Tidus"
        deckCards={[
          {
            id: "deck-card-1",
            deckId: "deck-a",
            cardScryfallId: "sol-ring-printing",
            cardName: "Sol Ring",
            quantity: 1,
            assignedQuantity: 0,
            isSideboard: true,
            manaCost: "{1}",
            typeLine: "Artifact",
            imageUri: null,
            ownedInCollection: 1,
            availableToAssign: 1,
            assignedInOtherDecks: [],
            missingCount: 0,
          },
        ]}
      />
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Sol Ring" })).toBeInTheDocument());
    expect(screen.getByText(/Tidus · Sideboard/)).toBeInTheDocument();
  });
});
