import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RequestedDecksBadge } from "@/components/requested-decks-badge";

const decks = [
  {
    deckId: "d1",
    deckName: "Atraxa",
    quantity: 1,
    completionPercentage: 42,
    colors: ["W", "U", "B", "G"],
  },
  { deckId: "d2", deckName: "Tidus", quantity: 1, completionPercentage: 80 },
  { deckId: "d3", deckName: "Y'shtola", quantity: 2, completionPercentage: 15.5 },
];

describe("RequestedDecksBadge", () => {
  it("shows only the count until the label is clicked", () => {
    render(
      <RequestedDecksBadge cardName="Sol Ring" decks={decks} count={36} />
    );

    expect(screen.getByRole("button", { name: /Se pide en 36 mazos/i })).toBeInTheDocument();
    expect(screen.queryByText("Atraxa")).not.toBeInTheDocument();
    expect(screen.queryByText(/más de 2 mazos/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Se pide en 36 mazos/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Atraxa")).toBeInTheDocument();
    expect(screen.getByText("Tidus")).toBeInTheDocument();
    expect(screen.getByText("Y'shtola")).toBeInTheDocument();
    expect(screen.getByText(/42% · 1 copia/i)).toBeInTheDocument();
    expect(screen.getByText(/15\.5% · 2 copias/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Atraxa/i })).toHaveAttribute("href", "/decks/d1");
    expect(screen.getByTestId("color-pip-G")).toBeInTheDocument();
    expect(screen.getByTestId("color-pip-W")).toBeInTheDocument();
  });
});
