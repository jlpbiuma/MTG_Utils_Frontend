import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardPreviewHover } from "@/components/card-preview-hover";
import * as cardDetailsClient from "@/lib/card-details-client";

vi.mock("@/lib/card-details-client", () => ({
  getCardDetails: vi.fn(),
}));

describe("CardPreviewHover", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders children without image preview initially", () => {
    render(
      <CardPreviewHover cardName="Sol Ring" imageUri="https://example.com/sol-ring.jpg">
        <span>Sol Ring Card</span>
      </CardPreviewHover>
    );

    expect(screen.getByText("Sol Ring Card")).toBeInTheDocument();
    expect(screen.queryByAltText("Sol Ring")).not.toBeInTheDocument();
  });

  it("renders card preview on mouse enter when imageUri is provided", () => {
    render(
      <CardPreviewHover cardName="Sol Ring" imageUri="https://example.com/sol-ring.jpg">
        <span>Sol Ring Card</span>
      </CardPreviewHover>
    );

    fireEvent.mouseEnter(screen.getByText("Sol Ring Card"));
    expect(screen.getByAltText("Sol Ring")).toBeInTheDocument();
  });

  it("fetches and renders card preview when imageUri is not provided", async () => {
    vi.mocked(cardDetailsClient.getCardDetails).mockResolvedValue({
      id: "card-123",
      name: "Black Lotus",
      image_uris: { normal: "https://example.com/black-lotus.jpg" },
    } as unknown as cardDetailsClient.SpanishCardDetails);



    render(
      <CardPreviewHover cardName="Black Lotus">
        <span>Black Lotus Card</span>
      </CardPreviewHover>
    );

    fireEvent.mouseEnter(screen.getByText("Black Lotus Card"));

    // Shows loading skeleton initially
    expect(screen.getByText("Cargando previsualización…")).toBeInTheDocument();

    // Resolves and displays image
    await waitFor(() => {
      expect(screen.getByAltText("Black Lotus")).toBeInTheDocument();
    });
    expect(cardDetailsClient.getCardDetails).toHaveBeenCalledWith({ name: "Black Lotus" });
  });

  it("hides card preview on mouse leave", () => {
    render(
      <CardPreviewHover cardName="Sol Ring" imageUri="https://example.com/sol-ring.jpg">
        <span>Sol Ring Card</span>
      </CardPreviewHover>
    );

    const trigger = screen.getByText("Sol Ring Card");
    fireEvent.mouseEnter(trigger);
    expect(screen.getByAltText("Sol Ring")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByAltText("Sol Ring")).not.toBeInTheDocument();
  });
});
