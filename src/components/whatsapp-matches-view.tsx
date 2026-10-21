"use client";

import { ViewToolbar, ToolbarSearch, ToolbarChoices, ToolbarSort } from "@/components/view-toolbar";

import React, { useState, useMemo, useTransition } from "react";
import { MessageCircle, Search, ShoppingCart, Tag, Clock, Layers, Sparkles, FolderOpen, Loader2, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OpportunityLinkGroups, OpportunityValue, OpportunityCompletion } from "@/components/opportunity-link-groups";
import { type OpportunitySelection, selectedQuantity, opportunityPrice, tradeQuantity, priceCurrency } from "@/lib/opportunity-selection";
import { CatalogCardGridItem } from "@/components/catalog-card-grid-item";
import dynamic from "next/dynamic";
import { compareOpportunityLink } from "@/actions/whatsapp-matches";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardImage as Image } from "@/components/card-image";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import type { WhatsAppMatchesResponse, WhatsAppDealMatch } from "@/actions/whatsapp-matches";

const CardDetailDialog = dynamic(() => import("@/components/card-detail-dialog").then((module) => module.CardDetailDialog));

interface WhatsAppMatchesViewProps {
  initialData: WhatsAppMatchesResponse;
}

export function WhatsAppMatchesView({ initialData }: WhatsAppMatchesViewProps) {
  const [selection, setSelection] = useState<OpportunitySelection>({});
  const [latestImport, setLatestImport] = useState<{ url: string; data: WhatsAppMatchesResponse } | null>(null);
  const mergeImports = (existing: WhatsAppDealMatch[], incoming: WhatsAppDealMatch[]) => {
    if (!latestImport) return existing;
    // Once the refreshed server props contain these records, use their new prices.
    if (incoming.length && incoming.every((match) => existing.some((saved) => saved.id === match.id))) return existing;
    return [...existing.filter((match) => !(match.extra.source === "manual" && match.whatsapp_url === latestImport.url)), ...incoming];
  };
  const wants = mergeImports(initialData.wants_matches, latestImport?.data.wants_matches ?? []);
  const collection = mergeImports(initialData.collection_matches, latestImport?.data.collection_matches ?? []);
  const data = { ...initialData, wants_matches: wants, collection_matches: collection,
    total_wants_matches: wants.length, total_collection_matches: collection.length,
    global_deck_count: latestImport?.data.global_deck_count ?? initialData.global_deck_count ?? 0,
    global_completion_before: latestImport?.data.global_completion_before ?? initialData.global_completion_before ?? 0 };
  const updateSelection = (changes: OpportunitySelection) => setSelection((previous) => ({ ...previous, ...changes }));
  const [activeTab, setActiveTab] = useState<"wants" | "collection">("wants");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<WhatsAppDealMatch | null>(null);
  const [selectionFilter, setSelectionFilter] = useState<"all" | "selected" | "unselected">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "priced" | "missing">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "whatsapp">("all");
  const [sort,setSort] = useState<"date" | "name" | "decks" | "price" | "cmc">("decks");
  const [direction,setDirection] = useState<"asc" | "desc">("desc");
  const [view,setView] = useState<"grid" | "list">("list");
  const sortMatches = (matches: WhatsAppDealMatch[]) => [...matches].sort((first, second) => {
    const value = (match: WhatsAppDealMatch) => sort === "price" ? opportunityPrice(match)
      : sort === "cmc" ? match.catalog_card?.cmc ?? null
      : sort === "decks" ? match.matched_want?.requested_decks.length ?? 0
      : Date.parse(match.detected_at ?? "") || 0;
    if (sort === "name") return (direction === "asc" ? 1 : -1) * first.card_name.localeCompare(second.card_name);
    const left = value(first), right = value(second);
    // Unknown values stay last in either direction. Prices sort within each currency.
    if (left === null || right === null) return left === right ? first.card_name.localeCompare(second.card_name) : left === null ? 1 : -1;
    const currency = sort === "price" ? priceCurrency(first).localeCompare(priceCurrency(second)) : 0;
    return currency || (direction === "asc" ? left - right : right - left) || first.card_name.localeCompare(second.card_name);
  });
  const filterMatches = (matches: WhatsAppDealMatch[]) => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((match) => {
      const selected = selectedQuantity(match, selection) > 0;
      if (selectionFilter === "selected" && !selected || selectionFilter === "unselected" && selected) return false;
      const priced = opportunityPrice(match) !== null;
      if (priceFilter === "priced" && !priced || priceFilter === "missing" && priced) return false;
      const manual = match.extra.source === "manual";
      if (sourceFilter === "manual" && !manual || sourceFilter === "whatsapp" && manual) return false;
      return !q || [match.card_name, match.source_phone, match.set_code, match.whatsapp_url,
        match.catalog_card?.type_line, match.catalog_card?.rarity, match.condition,
        ...(match.matched_want?.requested_decks ?? [])].some((value) => value?.toLowerCase().includes(q));
    });
  };
  const filteredWants = filterMatches(data.wants_matches);
  const filteredCollection = filterMatches(data.collection_matches);
  const hasFilters = Boolean(searchQuery || selectionFilter !== "all" || priceFilter !== "all" || sourceFilter !== "all");
  const clearFilters = () => { setSearchQuery(""); setSelectionFilter("all"); setPriceFilter("all"); setSourceFilter("all"); };

  return (
    <div className="space-y-8">
      {/* Encabezado y Estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              Oportunidades de Mercado
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs px-2.5 py-0.5"
            >
              Radar WhatsApp Activo
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Compara enlaces con tus mazos incompletos y colección, y consulta las
            oportunidades detectadas en WhatsApp.
          </p>
        </div>

        {/* Resumen de actividad */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg p-2.5 px-3.5">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>
              Escaneadas:{" "}
              <strong className="text-foreground font-semibold">
                {data.total_cards_scanned}
              </strong>
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {data.last_scraped_at ? (
                <>
                  Actualizado:{" "}
                  {new Date(data.last_scraped_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : (
                "Esperando actividad"
              )}
            </span>
          </div>
        </div>
      </div>

      <ManualLinkComparison onImported={(url, imported) => {
        setLatestImport({ url, data: imported });
        setActiveTab(imported.collection_matches.length ? "collection" : "wants");
      }} />
      <section aria-label="Valor global de oportunidades" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OpportunityValue matches={data.wants_matches} selection={selection} summary label="Valor global de compra" />
        <OpportunityValue matches={data.collection_matches} selection={selection} summary label="Valor global de venta" />
        <OpportunityValue matches={data.wants_matches} selection={selection} summary label="Valor de tendencia de la selección" metric="trend" />
        <OpportunityCompletion matches={data.wants_matches} selection={selection} deckCount={data.global_deck_count}
          before={data.global_completion_before} summary label="Completitud global con la selección" />
        <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground">Valores de las copias seleccionadas. Los precios de referencia son estimaciones; las monedas se muestran por separado.</p>
      </section>

      {/* Tabs y Buscador */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "wants" | "collection")}
        className="space-y-6"
      >
        <section aria-label="Configurar oportunidades" className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5">
          <h2 className="text-lg font-semibold tracking-tight">¿Qué oportunidades quieres comparar?</h2>
          <ViewToolbar
            label="Opciones de oportunidades"
            search={
              <ToolbarSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar carta, tipo, edición, mazo o enlace..."
              />
            }
            filters={
              <>
              <TabsList className="h-auto flex-wrap bg-muted/40 p-1 border border-border/60">
                <TabsTrigger
                  value="wants"
                  className="gap-2 data-[state=active]:bg-emerald-950/60 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 border border-transparent"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Comprar (Wants y mazos)</span>
                  <Badge
                    variant="secondary"
                    className={`ml-1 px-1.5 py-0.2 text-[11px] ${
                      data.total_wants_matches > 0
                        ? "bg-emerald-500/20 text-emerald-300 font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {data.total_wants_matches}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="collection"
                  className="gap-2 data-[state=active]:bg-sky-950/60 data-[state=active]:text-sky-300 data-[state=active]:border-sky-500/30 border border-transparent"
                >
                  <Tag className="h-4 w-4" />
                  <span>Vender (Tu colección en demanda)</span>
                  <Badge
                    variant="secondary"
                    className={`ml-1 px-1.5 py-0.2 text-[11px] ${
                      data.total_collection_matches > 0
                        ? "bg-sky-500/20 text-sky-300 font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {data.total_collection_matches}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <ToolbarChoices label="Selección" value={selectionFilter} onChange={setSelectionFilter}
                options={[{ value: "all", label: "Todas" }, { value: "selected", label: "Seleccionadas" }, { value: "unselected", label: "Sin seleccionar" }]} />
              <ToolbarChoices label="Precio" value={priceFilter} onChange={setPriceFilter}
                options={[{ value: "all", label: "Todos" }, { value: "priced", label: "Con precio" }, { value: "missing", label: "Sin precio" }]} />
              <ToolbarChoices label="Origen" value={sourceFilter} onChange={setSourceFilter}
                options={[{ value: "all", label: "Todos" }, { value: "manual", label: "Manual" }, { value: "whatsapp", label: "WhatsApp" }]} />
              {hasFilters ? <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button> : null}
              </>
            }
            sorting={
              <ToolbarSort
                value={sort}
                direction={direction}
                onChange={(value, dir) => {
                  setSort(value);
                  setDirection(dir);
                }}
                options={[
                  { value: "date", label: "Fecha", defaultDesc: true },
                  { value: "name", label: "Nombre" },
                  { value: "decks", label: "Nº Mazos", defaultDesc: true },
                  { value: "price", label: "Precio" },
                  { value: "cmc", label: "Valor de maná" },
                ]}
              />
            }
            display={
              <ToolbarChoices
                label="Vista"
                value={view}
                onChange={setView}
                options={[
                  { value: "list", label: "Listado", icon: <List aria-hidden="true" className="h-3.5 w-3.5" /> },
                  { value: "grid", label: "Cuadrícula", icon: <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" /> },
                ]}
              />
            }
          />
        </section>

        {/* Pestaña 1: Wants en Venta */}
        <TabsContent value="wants" className="space-y-4">
          {filteredWants.length === 0 ? (
            <EmptyState
              type="wants"
              hasSearch={hasFilters}
              onClearSearch={clearFilters}
            />
          ) : (
            <OpportunityLinkGroups matches={sortMatches(filteredWants)} allMatches={data.wants_matches}
              selection={selection} onSelectionChange={updateSelection} view={view}
              deckCount={data.global_deck_count} completionBefore={data.global_completion_before}
              renderCard={(match, controls) => <MatchCard match={match} mode="want" view={view} controls={controls} onOpen={() => setSelectedCard(match)} />} />
          )}
        </TabsContent>

        {/* Pestaña 2: Colección en Demanda */}
        <TabsContent value="collection" className="space-y-4">
          {filteredCollection.length === 0 ? (
            <EmptyState
              type="collection"
              hasSearch={hasFilters}
              onClearSearch={clearFilters}
            />
          ) : (
            <OpportunityLinkGroups matches={sortMatches(filteredCollection)} allMatches={data.collection_matches}
              selection={selection} onSelectionChange={updateSelection} view={view}
              deckCount={data.global_deck_count} completionBefore={data.global_completion_before}
              renderCard={(match, controls) => <MatchCard match={match} mode="collection" view={view} controls={controls} onOpen={() => setSelectedCard(match)} />} />
          )}
        </TabsContent>
      </Tabs>
      {selectedCard ? <CardDetailDialog cardName={selectedCard.card_name}
        imageUri={selectedCard.catalog_card?.image_uri} manaCost={selectedCard.catalog_card?.mana_cost}
        typeLine={selectedCard.catalog_card?.type_line} quantity={tradeQuantity(selectedCard)}
        ownedInCollection={selectedCard.matched_collection?.quantity_owned}
        missingCount={selectedCard.matched_want?.quantity_wanted}
        isOpen onOpenChange={(open) => { if (!open) setSelectedCard(null); }} /> : null}
    </div>
  );
}

function MatchCard({
  match,
  mode, view, controls, onOpen,
}: {
  match: WhatsAppDealMatch;
  mode: "want" | "collection";
  view: "grid" | "list";
  controls: React.ReactNode;
  onOpen: () => void;
}) {
  const isWant = mode === "want";
  const imageUri = match.catalog_card?.image_uri;
  const cardName = match.card_name;
  const manaCost = match.catalog_card?.mana_cost;
  const typeLine = match.catalog_card?.type_line;
  const isManual = match.extra.source === "manual";

  // Formato origen de enlace
  const originLabel = useMemo(() => {
    const url = match.whatsapp_url.toLowerCase();
    if (url.startsWith("ocr-image://")) return "Foto OCR";
    if (url.includes("manabox.app")) return "ManaBox";
    if (url.includes("moxfield.com")) return "Moxfield";
    if (url.includes("archidekt.com")) return "Archidekt";
    if (url.includes("cardmarket.com")) return "Cardmarket";
    return "Enlace Web";
  }, [match.whatsapp_url]);

  const context = <div className="space-y-3">
        {isWant && match.matched_want?.requested_decks.length ? <div className="text-xs text-muted-foreground space-y-1">
          <p className="inline-flex items-center gap-1.5"><FolderOpen className="h-3 w-3" />Solicitada en {match.matched_want.requested_decks.length} mazos</p>
          <p>Para: {match.matched_want.requested_decks.join(", ")}</p>
        </div> : null}
        {/* Origen y mensaje original si existe */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {originLabel}
            </Badge>
          </span>
          {match.detected_at && (
            <time dateTime={match.detected_at}>
              {new Date(match.detected_at).toLocaleString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </div>

        {match.raw_message && !match.whatsapp_url.startsWith("ocr-image://") && (
          <p className="text-[11px] text-muted-foreground/80 italic line-clamp-2 bg-muted/20 p-1.5 rounded border border-border/30">
            &ldquo;{match.raw_message}&rdquo;
          </p>
        )}
{controls}</div>;
  const footer = <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
    <p className="text-xs text-muted-foreground">{isManual ? "Importación manual" : `+${match.source_phone}`}</p>
    {!isManual ? <Button asChild size="sm" className="min-h-11 text-xs gap-1.5">
      <a href={match.direct_whatsapp_link} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3.5 w-3.5" />Contactar por WhatsApp</a>
    </Button> : null}
  </div>;
  if (view === "grid") return <CatalogCardGridItem name={cardName} imageUri={imageUri}
    typeLine={typeLine} manaCost={manaCost} onOpen={onOpen}
    badges={isWant ? <Badge variant="secondary">{match.matched_want?.requested_decks.length ?? 0} mazos</Badge> : null} footer={footer}>
    {match.set_code ? <p className="text-xs uppercase text-muted-foreground">[{match.set_code}]</p> : null}
    {context}
  </CatalogCardGridItem>;
  return <div className="grid grid-cols-1 items-center gap-x-5 gap-y-3 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] hover:bg-secondary/30 transition-colors">
    <div className="flex min-w-0 items-center gap-3">
      <CardPreviewHover cardName={cardName} imageUri={imageUri} className="shrink-0">
        <button type="button" onClick={onOpen} aria-label={`Ver imagen y detalles de ${cardName}`}
          className="relative block w-11 h-15 shrink-0 overflow-hidden rounded border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {imageUri ? <Image src={imageUri} alt={cardName} fill sizes="44px" className="object-cover" /> :
            <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">MTG</span>}
        </button>
      </CardPreviewHover>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-sm font-semibold">{tradeQuantity(match)}x</span>
          <h4 className="min-w-0 font-semibold text-sm text-foreground">
            <CardPreviewHover cardName={cardName} imageUri={imageUri} className="max-w-full">
              <button type="button" onClick={onOpen} aria-label={`Ver detalle de ${cardName}`}
                className="block max-w-full truncate rounded text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{cardName}</button>
            </CardPreviewHover>
          </h4>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="max-w-[150px] truncate" title={typeLine || undefined}>{typeLine || "Carta"}</span>
          <ManaCost manaCost={manaCost} />
          {match.set_code ? <span className="uppercase">[{match.set_code}]</span> : null}
          {match.condition ? <span>{match.condition}</span> : null}
        </div>
        {isWant && match.matched_want?.requested_decks.length ?
          <details className="text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded-md border border-border bg-secondary/60 px-2 py-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Layers aria-hidden="true" className="mr-1 inline h-3 w-3" />{match.matched_want.requested_decks.length} mazos
            </summary>
            <p className="pt-1">Para: {match.matched_want.requested_decks.join(", ")}</p>
          </details> : null}
        {!isWant && match.matched_collection ? <p className="text-xs text-muted-foreground">{match.matched_collection.quantity_owned} en colección · {match.matched_collection.available_quantity} libres</p> : null}
      </div>
    </div>
    <div className="min-w-0">{controls}</div>
    <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2 xl:col-span-1 xl:flex-col xl:items-end xl:text-right">
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <p><span>{isManual ? "Importación manual" : `+${match.source_phone}`}</span> · {originLabel}</p>
        {match.detected_at ? <time dateTime={match.detected_at} className="block">
          {new Date(match.detected_at).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </time> : null}
      </div>
      {!isManual ? <Button asChild size="sm" variant="outline" className="min-h-11 gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
        <a href={match.direct_whatsapp_link} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />Contactar por WhatsApp</a>
      </Button> : null}
    </div>
    {match.raw_message && !match.whatsapp_url.startsWith("ocr-image://") ?
      <details className="text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
        <summary className="min-h-7 w-fit cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver mensaje original</summary>
        <p className="mt-1 whitespace-pre-wrap break-words rounded border border-border bg-muted/20 p-2">{match.raw_message}</p>
      </details> : null}
  </div>;
}

function ManualLinkComparison({ onImported }: { onImported: (url: string, data: WhatsAppMatchesResponse) => void }) {
  const [url, setUrl] = useState("");
  const [subject, setSubject] = useState<"vende" | "compra_busca">("vende");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: WhatsAppMatchesResponse; subject: "vende" | "compra_busca"; url: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const validateUrl = (value: string) => {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
        (!parsed.port || parsed.port === "443") &&
        ["manabox.app", "www.manabox.app", "moxfield.com", "www.moxfield.com", "archidekt.com", "www.archidekt.com"].includes(parsed.hostname);
    } catch { return false; }
  };
  const matches = result?.subject === "vende" ? result.data.wants_matches : result?.data.collection_matches ?? [];

  return (
    <section aria-labelledby="manual-opportunity-title" className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="space-y-1">
        <h2 id="manual-opportunity-title" className="font-semibold text-lg">Comparar un enlace</h2>
        <p id="manual-link-help" className="text-sm text-muted-foreground">
          Pega una lista pública de ManaBox, Moxfield o Archidekt. Las cartas quedan guardadas en tus oportunidades con el día y la hora de importación.
        </p>
      </div>
      <form className="space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (!validateUrl(url)) {
          setError("Introduce un enlace HTTPS de ManaBox, Moxfield o Archidekt.");
          return;
        }
        setError(null);
        setResult(null);
        const submittedUrl = url.trim();
        const submittedSubject = subject;
        startTransition(async () => {
          try {
            const response = await compareOpportunityLink(submittedUrl, submittedSubject);
            if ("error" in response) setError(response.error);
            else {
              setResult({ data: response.data, subject: submittedSubject, url: submittedUrl });
              onImported(submittedUrl, response.data);
            }
          } catch {
            setError("No se pudo comparar el enlace. Inténtalo de nuevo.");
          }
        });
      }}>
        <fieldset disabled={pending} className="space-y-3">
          <legend className="text-sm font-medium mb-2">¿Qué hace la persona que comparte la lista?</legend>
          <div className="flex flex-col sm:flex-row gap-3">
            {([
              ["vende", "Vende cartas", "Comparar con lo que falta en mis mazos"],
              ["compra_busca", "Compra o busca cartas", "Encontrar copias libres de mi colección"],
            ] as const).map(([value, label, description]) => (
              <label key={value} className="flex flex-1 items-center gap-3 rounded-lg border border-border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input type="radio" name="manual-subject" value={value} checked={subject === value} onChange={() => { setSubject(value); setError(null); }} className="accent-primary" />
                <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{description}</span></span>
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <label htmlFor="manual-opportunity-url" className="text-sm font-medium">Enlace con cartas</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input id="manual-opportunity-url" type="url" required maxLength={2048} value={url}
                placeholder="https://manabox.app/decks/..." className="min-h-11 flex-1"
                aria-describedby={`manual-link-help${error ? " manual-link-error" : ""}`} aria-invalid={Boolean(error)}
                onChange={(event) => { setUrl(event.target.value); setError(null); }}
                onBlur={() => { if (url.trim() && !validateUrl(url)) setError("Introduce un enlace HTTPS de ManaBox, Moxfield o Archidekt."); }} />
              <Button type="submit" disabled={pending || !url.trim()} className="min-h-11 gap-2">
                {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Search aria-hidden="true" className="h-4 w-4" />}
                {pending ? "Comparando…" : "Comparar enlace"}
              </Button>
            </div>
          </div>
        </fieldset>
        {error ? <p id="manual-link-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
        {pending ? <p role="status" className="text-sm text-muted-foreground">Leyendo la lista y buscando coincidencias…</p> : null}
      </form>
      {result ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div role="status" className="space-y-1">
            <h3 className="font-medium">{result.subject === "vende" ? "Cartas para tus mazos incompletos" : "Cartas que puedes vender"}</h3>
            <p className="text-sm text-muted-foreground">{result.data.total_cards_scanned} cartas leídas · {matches.length} coincidencias</p>
            {result.data.last_scraped_at ? <p className="text-sm text-muted-foreground">Importación guardada: {new Date(result.data.last_scraped_at).toLocaleString()}</p> : null}
            {matches.length === 0 ? <p className="text-sm">{result.subject === "vende" ? "La lista no contiene cartas que falten en tus mazos activos." : "No tienes copias libres para las cartas de esta lista."}</p> : null}
          </div>
          {matches.length ? <p className="text-sm text-muted-foreground">Selecciona las cartas en el grupo de este enlace para generar tu lista.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({
  type,
  hasSearch,
  onClearSearch,
}: {
  type: "wants" | "collection";
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-card/30">
        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <h3 className="text-sm font-semibold text-foreground">
          No se encontraron resultados
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          No hay coincidencias con los filtros actuales.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-3 text-xs"
        >
          Limpiar filtro
        </Button>
      </div>
    );
  }

  const isWants = type === "wants";

  return (
    <div className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card/20 space-y-3">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
        {isWants ? (
          <ShoppingCart className="h-6 w-6 text-emerald-400/80" />
        ) : (
          <Tag className="h-6 w-6 text-sky-400/80" />
        )}
      </div>

      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {isWants
            ? "Sin ofertas de venta para tus Wants aún"
            : "Sin peticiones para tu colección actualmente"}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isWants
            ? "Cuando alguien comparta una lista o foto en WhatsApp con intención de venta de cartas que tienes en tus Wants, se mostrará aquí automáticamente."
            : "Cuando alguien en el grupo escriba «busco» o «compro» cartas que tienes en tu colección física, aparecerán aquí para que puedas contactarle."}
        </p>
      </div>
    </div>
  );
}
