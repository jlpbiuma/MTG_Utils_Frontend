import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { WhatsAppMatchesView } from "@/components/whatsapp-matches-view";
import type { WhatsAppDealMatch, WhatsAppMatchesResponse } from "@/actions/whatsapp-matches";

vi.mock("@/actions/whatsapp-matches", () => ({ compareOpportunityLink: vi.fn() }));
vi.mock("@/components/card-preview-hover", () => ({ CardPreviewHover: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/card-image", () => ({ CardImage: () => null }));
function card(id: number, name: string, url: string, price: number | null, quantity: number): WhatsAppDealMatch {
  return { id, card_name: name, normalized_name: name.toLowerCase(), subject: "vende", whatsapp_url: url,
    source_phone: "", direct_whatsapp_link: "", extra: { source: "manual" },
    matched_want: { want_id: "w", quantity_wanted: quantity, requested_decks: ["Commander"] },
    unit_price: price, price_currency: "EUR", price_source: price === null ? null : "cardmarket", trade_quantity: quantity };
}
const buy = [card(-1, "Alpha", "https://manabox.app/decks/one", 2, 3),
  card(-2, "Beta", "https://manabox.app/decks/one", 4, 2),
  card(-3, "Gamma", "https://manabox.app/decks/two", 3, 1),
  card(-4, "Unknown", "https://manabox.app/decks/one", null, 1)];
buy[2].price_currency = "USD";
const sale: WhatsAppDealMatch = { ...card(-5, "Sale Card", "https://manabox.app/decks/buyer", 5, 2),
  subject: "compra_busca", matched_want: null, matched_collection: { collection_id: "c", quantity_owned: 8, available_quantity: 2 } };
const data: WhatsAppMatchesResponse = { wants_matches: buy, collection_matches: [sale], total_wants_matches: 4, total_collection_matches: 1, total_cards_scanned: 5 };

it("updates global and per-link totals while selections survive filters and export stays in its link", () => {
  render(<WhatsAppMatchesView initialData={data} />);
  const global = within(screen.getByRole("status", { name: "Valor global de compra" }));
  expect(global.getByText(/14,00/)).toHaveTextContent(/3,00/);
  expect(global.getByText(/1 sin precio/)).toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Valor global de venta" })).toHaveTextContent(/10,00/);
  const link = within(screen.getByRole("region", { name: "Comprar · Enlace 1" }));
  expect(link.getByRole("status", { name: "Valor de compra del enlace" })).toHaveTextContent(/14,00/);
  fireEvent.click(link.getByRole("checkbox", { name: "Seleccionar Beta" }));
  expect(global.getByText(/6,00/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Alpha" } });
  const filtered = within(screen.getByRole("region", { name: "Comprar · Enlace 1" }));
  fireEvent.click(filtered.getByRole("button", { name: "Generar lista de compra" }));
  expect(screen.getByRole("textbox", { name: "Lista de cartas generada" })).toHaveValue("3 Alpha\n1 Unknown");
  fireEvent.click(screen.getAllByRole("button", { name: "Cerrar" })[0]);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
  expect(link.getByRole("checkbox", { name: "Seleccionar Beta" })).not.toBeChecked();
  expect(screen.queryByRole("spinbutton")).toBeNull();
  fireEvent.click(link.getByRole("button", { name: "Deseleccionar todas" }));
  expect(link.getByRole("button", { name: "Generar lista de compra" })).toBeDisabled();
  expect(global.getByText(/3,00/)).not.toHaveTextContent("EUR");
});

it("caps sale quantities at free copies and generates a separate sale list", () => {
  render(<WhatsAppMatchesView initialData={data} />);
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Vender \(Tu colección/ }));
  const link = within(screen.getByRole("region", { name: "Vender · Enlace 1" }));
  expect(screen.queryByRole("spinbutton")).toBeNull();
  fireEvent.click(link.getByRole("checkbox", { name: "Seleccionar Sale Card" }));
  expect(screen.getByRole("status", { name: "Valor global de venta" })).toHaveTextContent(/0,00/);
  fireEvent.click(link.getByRole("checkbox", { name: "Seleccionar Sale Card" }));
  expect(screen.getByRole("status", { name: "Valor global de venta" })).toHaveTextContent(/10,00/);
  fireEvent.click(link.getByRole("button", { name: "Generar lista de venta" }));
  expect(screen.getByRole("textbox", { name: "Lista de cartas generada" })).toHaveValue("2 Sale Card");
});

it("defaults to compact rows and preserves selection and exports when switching views", () => {
  render(<WhatsAppMatchesView initialData={data} />);
  expect(screen.getByRole("button", { name: "Listado" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Cuadrícula" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Ver imagen y detalles de Alpha" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ver detalle de Alpha" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Beta" }));
  fireEvent.click(screen.getByRole("button", { name: "Cuadrícula" }));
  expect(screen.getByRole("button", { name: "Cuadrícula" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Ver detalle de Alpha" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Seleccionar Beta" })).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Listado" }));
  expect(screen.getByRole("checkbox", { name: "Seleccionar Beta" })).not.toBeChecked();
  fireEvent.click(within(screen.getByRole("region", { name: "Comprar · Enlace 1" })).getByRole("button", { name: "Generar lista de compra" }));
  expect(screen.getByRole("textbox", { name: "Lista de cartas generada" })).toHaveValue("3 Alpha\n1 Unknown");
});

it("sorts each source grid by price in both directions with unknown prices last", () => {
  render(<WhatsAppMatchesView initialData={data} />);
  const source = screen.getByText("https://manabox.app/decks/one").closest("section")!;
  const names = () => Array.from(source.querySelectorAll("h4")).map((heading) => heading.textContent);
  fireEvent.click(within(screen.getByRole("group", { name: "Ordenar por" })).getByRole("button", { name: "Precio" }));
  expect(names()).toEqual(["Alpha", "Beta", "Unknown"]);
  fireEvent.click(within(screen.getByRole("group", { name: "Ordenar por" })).getByRole("button", { name: "Precio" }));
  expect(names()).toEqual(["Beta", "Alpha", "Unknown"]);
  fireEvent.click(within(screen.getByRole("group", { name: "Ordenar por" })).getByRole("button", { name: "Nombre" }));
  expect(names()).toEqual(["Alpha", "Beta", "Unknown"]);
});

it("combines selection, price, origin and catalogue search filters without losing source exports", () => {
  const automatic = { ...card(6, "Automatic", "https://moxfield.com/decks/auto", 1, 1), extra: {} };
  const alpha = { ...buy[0], set_code: "CMM", catalog_card: { name: "Alpha", type_line: "Artifact", cmc: 1 } };
  render(<WhatsAppMatchesView initialData={{ ...data, wants_matches: [alpha, ...buy.slice(1), automatic] }} />);
  const selection = within(screen.getByRole("group", { name: "Selección" }));
  const price = within(screen.getByRole("group", { name: "Precio" }));
  const source = within(screen.getByRole("group", { name: "Origen" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Beta" }));
  fireEvent.click(selection.getByRole("button", { name: "Seleccionadas" }));
  expect(screen.queryByRole("checkbox", { name: "Seleccionar Beta" })).toBeNull();
  fireEvent.click(price.getByRole("button", { name: "Sin precio" }));
  expect(screen.getByRole("checkbox", { name: "Seleccionar Unknown" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "Seleccionar Alpha" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(screen.getByRole("checkbox", { name: "Seleccionar Beta" })).not.toBeChecked();
  fireEvent.click(source.getByRole("button", { name: "WhatsApp" }));
  expect(screen.getByRole("checkbox", { name: "Seleccionar Automatic" })).toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "Seleccionar Alpha" })).toBeNull();
  fireEvent.click(source.getByRole("button", { name: "Manual" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "artifact" } });
  expect(screen.getByRole("checkbox", { name: "Seleccionar Alpha" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Generar lista de compra" }));
  expect(screen.getByRole("textbox", { name: "Lista de cartas generada" })).toHaveValue("3 Alpha\n1 Unknown");
});

it("defaults to most requested decks first, displays distinct trend and purchase values, and dims deselected cards", () => {
  const alpha = { ...buy[0], trend_unit_price: 3.5, global_completion_after: 85, completion_gain: 35,
    matched_want: { want_id: "a", quantity_wanted: 3, requested_decks: ["One", "Two", "Three"] } };
  const beta = { ...buy[1], trend_unit_price: 5, global_completion_after: 60, completion_gain: 10 };
  render(<WhatsAppMatchesView initialData={{ ...data, wants_matches: [beta, alpha] }} />);
  expect(within(screen.getByRole("group", { name: "Ordenar por" })).getByRole("button", { name: "Nº Mazos" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /Orden descendente/ })).toBeInTheDocument();
  const source = screen.getByText("https://manabox.app/decks/one").closest("section")!;
  expect(Array.from(source.querySelectorAll("h4")).map((el) => el.textContent)).toEqual(["Alpha", "Beta"]);
  const alphaCard = screen.getByRole("checkbox", { name: "Seleccionar Alpha" }).closest('[data-selected]')!;
  expect(alphaCard).toHaveTextContent("Valor de tendencia: 3,50");
  expect(alphaCard).toHaveTextContent("Valor de compra: 6,00");
  expect(alphaCard).toHaveTextContent("Completitud global si se añade: 85.00%");
  expect(alphaCard).toHaveAttribute("data-selected", "true");
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Alpha" }));
  expect(alphaCard).toHaveAttribute("data-selected", "false");
  expect(alphaCard).toHaveClass("opacity-50", "grayscale", "brightness-75");
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Alpha" }));
  expect(alphaCard).not.toHaveClass("opacity-50");
  expect(screen.queryByRole("spinbutton")).toBeNull();
  expect(screen.queryByRole("link", { name: "Abrir lista original" })).toBeNull();
});

it("projects global completion for the whole selection and caps duplicate offers at actual deck needs", () => {
  const impact = (id: string, deck: string, total: number, owned: number) => ({ deck_card_id: id,
    deck_id: deck, total_cards: total, owned_cards: owned, quantity: 2, assigned_quantity: 0, collection_quantity: 0 });
  const alpha = { ...buy[0], completion_requirements: [impact("a-alpha", "a", 10, 5), impact("b-alpha", "b", 4, 2)] };
  const duplicate = { ...alpha, id: -22, whatsapp_url: "https://manabox.app/decks/duplicate" };
  const beta = { ...buy[1], completion_requirements: [impact("a-beta", "a", 10, 5)] };
  render(<WhatsAppMatchesView initialData={{ ...data, wants_matches: [alpha, duplicate, beta], global_deck_count: 2, global_completion_before: 50 }} />);
  const progress = screen.getByRole("status", { name: "Completitud global con la selección" });
  expect(progress).toHaveTextContent("50.00% → 72.50%");
  fireEvent.click(screen.getAllByRole("checkbox", { name: "Seleccionar Alpha" })[0]);
  expect(progress).toHaveTextContent("72.50%"); // the other selected offer still covers Alpha
  fireEvent.click(screen.getAllByRole("checkbox", { name: "Seleccionar Alpha" })[1]);
  expect(progress).toHaveTextContent("50.00% → 55.00%");
  fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Beta" }));
  expect(progress).toHaveTextContent("50.00% → 50.00%");
});
