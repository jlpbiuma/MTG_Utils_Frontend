import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { searchCards } from "@/actions/scryfall";
import { createDeck } from "@/actions/decks";

vi.mock("@/actions/scryfall", () => ({ searchCards: vi.fn() }));
vi.mock("@/actions/decks", () => ({ createDeck: vi.fn() }));

const cards = [
  { id: "1", name: "Aragorn, the Uniter" },
  { id: "2", name: "Aragorn, King of Gondor" },
  { id: "3", name: "Aragorn, Company Leader" },
];
const response = { data: cards, total_cards: 3, has_more: false };

function openDialog() {
  render(<CreateDeckDialog />);
  fireEvent.click(screen.getByRole("button", { name: "Nuevo Mazo" }));
  return screen.getByRole("textbox", { name: "Comandante" });
}

describe("CreateDeckDialog commander search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(searchCards).mockResolvedValue(response);
    vi.mocked(createDeck).mockResolvedValue({ id: "deck-1" } as Awaited<ReturnType<typeof createDeck>>);
  });

  it("offers at least three matching cards and creates the deck with the chosen full name", async () => {
    const input = openDialog();
    fireEvent.change(screen.getByPlaceholderText("ej: Urza Lord High Artificer Combo"), { target: { value: "Mi mazo" } });
    fireEvent.change(input, { target: { value: "Aragorn" } });
    const suggestions = await screen.findByRole("list", { name: "Cartas sugeridas" });
    expect(within(suggestions).getAllByRole("button")).toHaveLength(3);
    expect(searchCards).toHaveBeenCalledWith("Aragorn");
    fireEvent.click(within(suggestions).getByRole("button", { name: cards[1].name }));
    expect(input).toHaveValue(cards[1].name);
    expect(screen.queryByRole("list", { name: "Cartas sugeridas" })).not.toBeInTheDocument();
    expect(createDeck).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Crear Mazo" }));
    await waitFor(() => expect(createDeck).toHaveBeenCalledWith(expect.objectContaining({ name: "Mi mazo", commander: cards[1].name })));
  });

  it("discards an old response after the user changes the name", async () => {
    let resolveOld!: (value: typeof response) => void;
    vi.mocked(searchCards).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const input = openDialog();
    fireEvent.change(input, { target: { value: "Aragorn" } });
    await waitFor(() => expect(searchCards).toHaveBeenCalledOnce());
    fireEvent.change(input, { target: { value: "Atraxa" } });
    vi.mocked(searchCards).mockResolvedValue({ ...response, data: [{ id: "4", name: "Atraxa, Praetors' Voice" }] });
    await screen.findByRole("button", { name: "Atraxa, Praetors' Voice" });
    await act(async () => resolveOld(response));
    expect(screen.queryByRole("button", { name: cards[0].name })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atraxa, Praetors' Voice" })).toBeInTheDocument();
  });

  it("shows no-results feedback and clears suggestions when the input is emptied", async () => {
    vi.mocked(searchCards).mockResolvedValue({ ...response, data: [] });
    const input = openDialog();
    fireEvent.change(input, { target: { value: "zzzz" } });
    await screen.findByText("No se encontraron cartas. Prueba con otro nombre.");
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.queryByText("No se encontraron cartas. Prueba con otro nombre.")).not.toBeInTheDocument();
    expect(input).toHaveValue("");
  });
});
