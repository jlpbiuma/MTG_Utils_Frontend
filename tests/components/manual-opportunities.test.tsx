import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { WhatsAppMatchesView } from "@/components/whatsapp-matches-view";
import { compareOpportunityLink } from "@/actions/whatsapp-matches";
import type { WhatsAppMatchesResponse, WhatsAppDealMatch } from "@/actions/whatsapp-matches";

vi.mock("@/actions/whatsapp-matches", () => ({ compareOpportunityLink: vi.fn() }));
vi.mock("@/components/card-preview-hover", () => ({ CardPreviewHover: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/card-image", () => ({ CardImage: () => null }));
const empty: WhatsAppMatchesResponse = { wants_matches: [], collection_matches: [], total_wants_matches: 0, total_collection_matches: 0, total_cards_scanned: 0 };
const card: WhatsAppDealMatch = {
  id: 0, card_name: "Sol Ring", normalized_name: "sol ring", subject: "vende",
  whatsapp_url: "https://manabox.app/decks/public", source_phone: "", direct_whatsapp_link: "",
  extra: { source: "manual", quantity: 3 },
  matched_want: { want_id: "", quantity_wanted: 2, requested_decks: ["My Commander"] },
};
beforeEach(() => { vi.mocked(compareOpportunityLink).mockReset(); });
function form() {
  render(<WhatsAppMatchesView initialData={empty} />);
  const section = within(screen.getByRole("region", { name: "Comparar un enlace" }));
  fireEvent.change(section.getByLabelText("Enlace con cartas"), { target: { value: "https://manabox.app/decks/public" } });
  return section;
}

it("compares a sale list and shows missing decks with original-list links", async () => {
  vi.mocked(compareOpportunityLink).mockResolvedValue({ data: { ...empty, total_cards_scanned: 4, total_wants_matches: 1, wants_matches: [card] } });
  const section = form();
  fireEvent.click(section.getByRole("button", { name: "Comparar enlace" }));
  expect(await screen.findByText("Sol Ring")).toBeInTheDocument();
  expect(compareOpportunityLink).toHaveBeenCalledWith("https://manabox.app/decks/public", "vende");
  expect(screen.getByText("Para: My Commander")).toBeInTheDocument();
  expect(section.getByText("4 cartas leídas · 1 coincidencias")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Abrir lista original" })).toBeNull();
  expect(screen.queryByRole("spinbutton")).toBeNull();
  expect(section.queryByRole("link", { name: "Contactar por WhatsApp" })).toBeNull();
});

it("compares a buyer list against free collection copies", async () => {
  vi.mocked(compareOpportunityLink).mockResolvedValue({ data: { ...empty, total_cards_scanned: 1, total_collection_matches: 1, collection_matches: [{ ...card, subject: "compra_busca", matched_want: null, matched_collection: { collection_id: "c1", quantity_owned: 4, available_quantity: 2 } }] } });
  const section = form();
  fireEvent.click(section.getByRole("radio", { name: /Compra o busca cartas/ }));
  fireEvent.click(section.getByRole("button", { name: "Comparar enlace" }));
  expect(await section.findByText("Cartas que puedes vender")).toBeInTheDocument();
  expect(compareOpportunityLink).toHaveBeenCalledWith("https://manabox.app/decks/public", "compra_busca");
  expect(screen.getByRole("checkbox", { name: "Seleccionar Sol Ring" })).toBeChecked();
  expect(screen.queryByRole("spinbutton")).toBeNull();
});

it("reports loading, blocks duplicate submissions, and distinguishes zero matches", async () => {
  let resolve!: (value: { data: WhatsAppMatchesResponse }) => void;
  vi.mocked(compareOpportunityLink).mockImplementation(() => new Promise((done) => { resolve = done; }));
  const section = form();
  fireEvent.click(section.getByRole("button", { name: "Comparar enlace" }));
  expect(section.getByRole("button", { name: "Comparando…" })).toBeDisabled();
  expect(section.getByLabelText("Enlace con cartas")).toBeDisabled();
  expect(section.getByText("Leyendo la lista y buscando coincidencias…")).toBeInTheDocument();
  await act(async () => resolve({ data: { ...empty, total_cards_scanned: 20 } }));
  expect(section.getByText("20 cartas leídas · 0 coincidencias")).toBeInTheDocument();
  expect(section.getByText("La lista no contiene cartas que falten en tus mazos activos.")).toBeInTheDocument();
});

it("rejects unsupported links locally and displays server errors inline", async () => {
  const section = form();
  const input = section.getByLabelText("Enlace con cartas");
  fireEvent.change(input, { target: { value: "https://example.com/list" } });
  fireEvent.click(section.getByRole("button", { name: "Comparar enlace" }));
  expect(section.getByRole("alert")).toHaveTextContent("Introduce un enlace HTTPS");
  expect(compareOpportunityLink).not.toHaveBeenCalled();
  vi.mocked(compareOpportunityLink).mockResolvedValue({ error: "La lista es privada." });
  fireEvent.change(input, { target: { value: "https://manabox.app/decks/public" } });
  fireEvent.click(section.getByRole("button", { name: "Comparar enlace" }));
  expect(await section.findByRole("alert")).toHaveTextContent("La lista es privada.");
  expect(input).toHaveValue("https://manabox.app/decks/public");
});

it("shows saved manual opportunities and their date and time when reopening the page", () => {
  const importedAt = "2026-10-01T12:30:00+00:00";
  const saved = { ...empty, total_cards_scanned: 1, total_wants_matches: 1,
    last_scraped_at: importedAt, wants_matches: [{ ...card, id: -42, detected_at: importedAt }] };
  const first = render(<WhatsAppMatchesView initialData={saved} />);
  expect(screen.getByText("Sol Ring")).toBeInTheDocument();
  first.unmount();
  const { container } = render(<WhatsAppMatchesView initialData={saved} />);
  expect(screen.getByText("Sol Ring")).toBeInTheDocument();
  expect(screen.getByText("Importación manual")).toBeInTheDocument();
  expect(container.querySelector("time")).toHaveAttribute("dateTime", importedAt);
  expect(container.querySelector("time")).toHaveTextContent("2026");
  expect(container.querySelector("time")).toHaveTextContent(/\d{2}:\d{2}/);
  expect(compareOpportunityLink).not.toHaveBeenCalled();
});
