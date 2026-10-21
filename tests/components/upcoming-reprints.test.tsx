import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { UpcomingReprintWarning } from "@/components/upcoming-reprint-warning";
import { SimulatedCardTable } from "@/components/simulated-card-table";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import { simulationListCards } from "@/lib/simulated-card-list";
import { getCardDetails } from "@/lib/card-details-client";
import { analyzeRawSimulatedCollection } from "@/actions/simulated-collections";
import type { SpanishCardDetails } from "@/actions/scryfall";
import type { SimulatedCollectionAnalysisResponse } from "@/actions/simulated-collections";
import fixture from "../fixtures/reprints/foundations-commander.json";
import analysisFixture from "../fixtures/cardmarket/list-3-analysis.json";
vi.mock("@/lib/card-details-client", () => ({ getCardDetails: vi.fn() }));
vi.mock("@/actions/simulated-collections", () => ({ analyzeRawSimulatedCollection: vi.fn(), createSimulatedCollection: vi.fn(), getSimulatedCollection: vi.fn(), importOfferLink: vi.fn(), applySimulatedPrinting: vi.fn() }));
const notice = { setCode: fixture.set.code, setName: fixture.set.name, releaseDate: fixture.set.released_at };
const card = { ...analysisFixture.cards[0], cardName: fixture.cards[0].name, upcomingReprints: [notice] };
const analysis = { ...analysisFixture, cards: [card] } as SimulatedCollectionAnalysisResponse;
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-01T12:00:00Z")); });
afterEach(() => { vi.useRealTimers(); });

it("shows an accessible yellow warning with the official set and release date", async () => {
  const onClick = vi.fn();
  render(<div onClick={onClick}><UpcomingReprintWarning reprints={[notice]} /></div>);
  const warning = screen.getByRole("button", { name: /Reimpresión próxima: Foundations Commander.*02\/10\/2026/ });
  expect(warning).toHaveClass("text-yellow-600");
  fireEvent.click(warning);
  expect(await screen.findByText("Reimpresión anunciada")).toBeInTheDocument();
  expect(screen.getByText("Foundations Commander")).toBeInTheDocument();
  expect(screen.getByText("02/10/2026")).toHaveAttribute("datetime", "2026-10-02");
  expect(onClick).not.toHaveBeenCalled();
});

it("hides absent warnings and expires a cached warning on its release day", () => {
  const view = render(<UpcomingReprintWarning />);
  expect(screen.queryByRole("button")).toBeNull();
  view.rerender(<UpcomingReprintWarning reprints={[notice]} />);
  expect(screen.getByRole("button")).toBeInTheDocument();
  vi.setSystemTime(new Date("2026-10-02T00:00:00Z"));
  view.rerender(<UpcomingReprintWarning reprints={[notice]} />);
  expect(screen.queryByRole("button")).toBeNull();
});

it("shows warnings next to cards in the offer table", () => {
  render(<SimulatedCardTable cards={simulationListCards(analysis)} symbol="€" onDetails={vi.fn()} onDecks={vi.fn()} />);
  const row = screen.getByRole("row", { name: /Taurean Mauler/ });
  expect(within(row).getByRole("button", { name: /Reimpresión próxima/ })).toBeInTheDocument();
});

it("shows the warning in the Spanish card detail without loading each edition again", async () => {
  vi.mocked(getCardDetails).mockResolvedValue({ id: "mauler", name: fixture.cards[0].name, name_es: fixture.cards[0].name_es,
    type_line: "Creature — Shapeshifter", type_line_es: "Criatura — Metamorfo", oracle_text: "", oracle_text_es: "", rarity: "rare", rarity_es: "Rara", set: "fdn", collector_number: "634", has_spanish_print: true, printings: [
      { id: "old-print", set_code: "fdn", set_name: "Antigua edición", collector_number: "634", released_at: "2024-11-15" },
      { id: "new-print", set_code: "fdc", set_name: "Otra edición", collector_number: "210", released_at: "2024-11-15", set_released_at: "2026-10-02" },
    ], legalities: [], upcomingReprints: [notice] } as SpanishCardDetails);
  render(<CardDetailDialog isOpen cardName={fixture.cards[0].name} cardId="old-print" />);
  expect(await screen.findByRole("heading", { name: /Lacerador taurino/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Reimpresión próxima/ }));
  expect(await screen.findByText("02/10/2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.getByText(/oct 2026/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Otra edición").closest("button")!);
  expect(screen.getByRole("button", { name: /Reimpresión próxima/ })).toBeInTheDocument();
  expect(getCardDetails).toHaveBeenCalledTimes(1);
});

it("shows the warning while evaluating a pasted Spanish offer", async () => {
  vi.mocked(analyzeRawSimulatedCollection).mockResolvedValue(structuredClone(analysis));
  render(<SimulatedCollectionDialog isOpen onOpenChange={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Listado de cartas a simular" }), { target: { value: "1 Lacerador taurino\n1 Ráptor imponente" } });
  fireEvent.click(screen.getByRole("button", { name: "Evaluar oferta" }));
  expect(await screen.findByRole("button", { name: /Reimpresión próxima/ })).toBeInTheDocument();
});
