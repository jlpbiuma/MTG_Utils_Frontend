import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CardSearchDialog } from "@/components/card-search-dialog";

vi.mock("@/components/card-detail-dialog", () => ({ CardDetailDialog: () => null }));
vi.mock("@/components/card-image", () => ({ CardImage: () => null }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("debounces GET searches, aborts stale requests and ignores late results", async () => {
  vi.useFakeTimers();
  let resolveOld!: (value: unknown) => void;
  const fetchMock = vi.fn()
    .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "new", name: "Lightning Bolt" }] }) });
  vi.stubGlobal("fetch", fetchMock);
  render(<CardSearchDialog onAddCard={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Añadir Carta" }));
  const input = screen.getByRole("textbox", { name: "Buscar cartas en Scryfall" });
  fireEvent.change(input, { target: { value: "So" } });
  expect(fetchMock).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
  const signal = fetchMock.mock.calls[0][1].signal;
  fireEvent.change(input, { target: { value: "Lightning" } });
  expect(signal.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(350); });
  expect(fetchMock.mock.calls[1][0]).toBe("/api/scryfall/search?q=Lightning");
  expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
  await act(async () => {
    resolveOld({ ok: true, json: async () => ({ data: [{ id: "old", name: "Sol Ring" }] }) });
  });
  expect(screen.queryByText("Sol Ring")).not.toBeInTheDocument();
  expect(screen.getByText("Lightning Bolt")).toBeInTheDocument();
});
