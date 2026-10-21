import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeckAssignmentNotices } from "@/components/deck-assignment-notices";
import { acceptDeckAssignmentNotice } from "@/actions/decks";
vi.mock("@/actions/decks", () => ({ acceptDeckAssignmentNotice: vi.fn() }));
const notices = [
  { id: "1", deckId: "a", cardName: "Sol Ring", deckName: "Mazo A", quantity: 1, createdAt: "2026-10-04" },
  { id: "2", deckId: "b", cardName: "Island", deckName: "Mazo B", quantity: 2, createdAt: "2026-10-04" },
];
describe("deck assignment notices", () => {
  beforeEach(() => vi.resetAllMocks());
  it("stacks notices and removes only the accepted notice", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockResolvedValue();
    render(<DeckAssignmentNotices notices={notices} />);
    expect(screen.getAllByRole("status")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Aceptar aviso de Sol Ring para Mazo A" }));
    await waitFor(() => expect(screen.queryByText("1 × Sol Ring")).not.toBeInTheDocument());
    expect(screen.getByText("2 × Island")).toBeInTheDocument();
    expect(acceptDeckAssignmentNotice).toHaveBeenCalledWith("1");
  });
  it("keeps the notice and offers retry when acceptance fails", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockRejectedValue(new Error("offline"));
    render(<DeckAssignmentNotices notices={notices} />);
    const button = screen.getByRole("button", { name: "Aceptar aviso de Sol Ring para Mazo A" });
    fireEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo aceptar");
    expect(screen.getByText("1 × Sol Ring")).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
