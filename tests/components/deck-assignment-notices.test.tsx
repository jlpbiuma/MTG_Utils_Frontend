import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DeckAssignmentNotices } from "@/components/deck-assignment-notices";
import { acceptDeckAssignmentNotice } from "@/actions/decks";

vi.mock("@/actions/decks", () => ({ acceptDeckAssignmentNotice: vi.fn() }));

const notices = [
  { id: "1", deckId: "a", cardName: "Sol Ring", deckName: "Mazo A", quantity: 1, createdAt: "2026-10-04" },
  { id: "2", deckId: "b", cardName: "Island", deckName: "Mazo B", quantity: 2, createdAt: "2026-10-04" },
];

describe("deck assignment notices", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a single compact horizontal status bar and shows details on hover", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockResolvedValue();
    render(<DeckAssignmentNotices notices={notices} />);

    // Compact single line bar
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByText("2 avisos")).toBeInTheDocument();
    expect(screen.getByText(/Introduce/)).toBeInTheDocument();

    // Hover on trigger to open tooltip
    const trigger = screen.getByRole("button", { name: "Ver detalle de cartas pendientes de introducir" });
    fireEvent.mouseEnter(trigger);

    // Cards and destination decks are visible in tooltip
    expect(screen.getByText("1 ×")).toBeInTheDocument();
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Mazo A")).toBeInTheDocument();
    expect(screen.getByText("2 ×")).toBeInTheDocument();
    expect(screen.getByText("Island")).toBeInTheDocument();
    expect(screen.getByText("Mazo B")).toBeInTheDocument();

    // Accept single notice
    fireEvent.click(screen.getByRole("button", { name: "Aceptar aviso de Sol Ring para Mazo A" }));
    await waitFor(() => expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument());
    expect(screen.getAllByText("Island").length).toBeGreaterThanOrEqual(1);
    expect(acceptDeckAssignmentNotice).toHaveBeenCalledWith("1");
  });

  it("allows accepting all notices with the batch action button", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockResolvedValue();
    render(<DeckAssignmentNotices notices={notices} />);

    const acceptAllBtn = screen.getByRole("button", { name: "Aceptar todos los avisos de asignación" });
    expect(acceptAllBtn).toHaveTextContent("Aceptar todas (2)");

    fireEvent.click(acceptAllBtn);
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(acceptDeckAssignmentNotice).toHaveBeenCalledWith("1");
    expect(acceptDeckAssignmentNotice).toHaveBeenCalledWith("2");
  });

  it("keeps the notice and offers retry when acceptance fails", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockRejectedValue(new Error("offline"));
    render(<DeckAssignmentNotices notices={notices} />);

    const trigger = screen.getByRole("button", { name: "Ver detalle de cartas pendientes de introducir" });
    fireEvent.mouseEnter(trigger);

    const button = screen.getByRole("button", { name: "Aceptar aviso de Sol Ring para Mazo A" });
    fireEvent.click(button);

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toHaveTextContent("No se pudo aceptar el aviso");
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("renders a single notice directly in the compact horizontal line", async () => {
    vi.mocked(acceptDeckAssignmentNotice).mockResolvedValue();
    render(<DeckAssignmentNotices notices={[notices[0]]} />);

    expect(screen.getByText("1 aviso")).toBeInTheDocument();
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Mazo A")).toBeInTheDocument();

    const acceptBtn = screen.getByRole("button", { name: "Aceptar aviso de Sol Ring para Mazo A" });
    fireEvent.click(acceptBtn);

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(acceptDeckAssignmentNotice).toHaveBeenCalledWith("1");
  });
});
