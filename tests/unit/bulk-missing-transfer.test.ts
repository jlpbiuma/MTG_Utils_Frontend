import { describe, it, expect, vi, beforeEach } from "vitest";
import { addMissingCardsToCollection } from "@/actions/decks";
import { backendFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  backendFetch: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/actions/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-test-123"),
}));

describe("Deck Bulk Missing Cards Transfer (Swift Parity)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call backend /api/decks/:id/add-missing endpoint and return success with count", async () => {
    const mockResponse = { status: "success", addedCount: 14 };
    vi.mocked(backendFetch).mockResolvedValueOnce(mockResponse);

    const result = await addMissingCardsToCollection("deck-xyz-456");

    expect(backendFetch).toHaveBeenCalledWith("/api/decks/deck-xyz-456/add-missing", {
      method: "POST",
      userId: "user-test-123",
    });

    expect(result).toEqual({
      success: true,
      addedCount: 14,
    });
  });

  it("should handle error when backend fails", async () => {
    vi.mocked(backendFetch).mockRejectedValueOnce(new Error("Deck not found"));

    await expect(addMissingCardsToCollection("non-existent-deck")).rejects.toThrow(
      "Deck not found"
    );
  });

  it("should call backend /api/decks/cards/:id/add-missing endpoint for a single card", async () => {
    const { addMissingCardToCollection } = await import("@/actions/decks");
    const mockResponse = { status: "success", addedCount: 1 };
    vi.mocked(backendFetch).mockResolvedValueOnce(mockResponse);

    const result = await addMissingCardToCollection("deck-123", "card-456");

    expect(backendFetch).toHaveBeenCalledWith("/api/decks/cards/card-456/add-missing", {
      method: "POST",
      userId: "user-test-123",
    });

    expect(result).toEqual({
      success: true,
      addedCount: 1,
    });
  });
});
