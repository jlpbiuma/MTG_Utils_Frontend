"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CardImage as Image } from "@/components/card-image";
import {
  Heart,
  Search,
  Plus,
  Minus,
  Trash2,
  Image as ImageIcon,
  FolderTree,
  LayoutGrid,
  Eye,
} from "lucide-react";
import { WantsPriceMovers } from "@/components/wants-price-movers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { CardSearchDialog } from "@/components/card-search-dialog";
import { ExportListDialog } from "@/components/export-list-dialog";
import {
  addOrIncrementWant,
  updateWantQuantity,
  deleteWantCard,
  getWantQuery,
  type WantCardDTO,
  type WantQueryResponse,
} from "@/actions/wants";
import { PriceProvider, PriceSummary } from "@/lib/pricing";
import { PricingProviderSelector } from "@/components/pricing-provider-selector";
import { PriceBadge } from "@/components/price-badge";
import { CardSortingBar } from "@/components/card-sorting-bar";
import { PriceFilter } from "@/components/price-filter";
import type { SortField, SortDirection } from "@/lib/sorting";
import { normalizeCardName } from "@/lib/card-utils";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { RequestedDecksBadge } from "@/components/requested-decks-badge";
import { filterWantCards } from "@/lib/want-filters";
import { CARD_TYPE_GROUPS } from "@/lib/card-utils";
import { COLOR_ORDER } from "@/lib/deck-colors";

interface WantsViewProps {
  initialView?: WantQueryResponse | null;
  initialStats: { uniqueCards: number; totalCards: number; decksCount?: number };
}

export function WantsView({ initialView, initialStats }: WantsViewProps) {
  const [view, setView] = useState<WantQueryResponse | null>(initialView ?? null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] =
    useState<WantCardDTO | null>(null);
  const [isGroupedByType, setIsGroupedByType] = useState(
    initialView?.grouped ?? false
  );
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [priceProvider, setPriceProvider] = useState<PriceProvider>("cardmarket");
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [edition, setEdition] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorlessOnly, setColorlessOnly] = useState(false);
  const [typeKey, setTypeKey] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadView = useCallback(async () => {
    setIsLoadingView(true);
    try {
      const next = await getWantQuery({
        searchQuery: debouncedQuery,
        sort: sortField,
        direction: sortDirection,
        grouped: isGroupedByType && !debouncedQuery,
        priceProvider,
      });
      if (next) setView(next);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingView(false);
    }
  }, [debouncedQuery, sortField, sortDirection, isGroupedByType, priceProvider]);

  useEffect(() => {
    loadView();
  }, [loadView]);

  const loadPrices = useCallback(
    async (providerToLoad = priceProvider, bypassCache = false) => {
      setIsLoadingPrices(true);
      try {
        const cards = (
          view?.cards?.length
            ? view.cards
            : view?.sections?.flatMap((s) => s.cards) || []
        ).map((c) => ({
          name: c.cardName,
          scryfallId: c.cardScryfallId,
          quantity: c.quantity,
          ownedQuantity: 0,
          missingQuantity: c.quantity,
          isMissing: true,
        }));
        if (cards.length === 0) {
          setPriceSummary(null);
          return;
        }
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards,
            provider: providerToLoad,
            bypassCache,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.summary) setPriceSummary(json.summary);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [priceProvider, view]
  );

  useEffect(() => {
    if (view) loadPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.uniqueCards, priceProvider]);

  const handleAddCard = async (card: {
    cardScryfallId: string;
    cardName: string;
    quantity: number;
    manaCost?: string | null;
    typeLine?: string | null;
    imageUri?: string | null;
  }) => {
    try {
      await addOrIncrementWant({
        cardScryfallId: card.cardScryfallId,
        cardName: card.cardName,
        quantity: card.quantity,
        imageUri: card.imageUri,
        manaCost: card.manaCost,
        typeLine: card.typeLine,
      });
      await loadView();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (raw.includes("409") || raw.toLowerCase().includes("colección")) {
        alert(`Ya tienes «${card.cardName}» en la colección. No se añade a wants.`);
        return;
      }
      alert(raw || "No se pudo añadir a wants");
    }
  };

  const handleUpdateQty = async (id: string, current: number, delta: number) => {
    setBusyId(id);
    try {
      await updateWantQuantity(id, Math.max(0, current + delta));
      await loadView();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Quitar "${name}" de wants?`)) return;
    setBusyId(id);
    try {
      await deleteWantCard(id);
      await loadView();
    } finally {
      setBusyId(null);
    }
  };

  const parsedMin = minPrice.trim() === "" ? null : Number(minPrice);
  const parsedMax = maxPrice.trim() === "" ? null : Number(maxPrice);
  const wantFilters = {
    minPrice: parsedMin != null && Number.isFinite(parsedMin) ? parsedMin : null,
    maxPrice: parsedMax != null && Number.isFinite(parsedMax) ? parsedMax : null,
    setCode: edition,
    colors: selectedColors,
    colorless: colorlessOnly,
    typeKey,
  };

  const displayedView = useMemo(() => {
    if (!view) return view;
    const quotes = priceSummary?.quotes;
    if (view.grouped) {
      const sections = view.sections
        .map((section) => {
          const cards = filterWantCards(section.cards, wantFilters, quotes);
          return {
            ...section,
            cards,
            uniqueCards: cards.length,
            totalCards: cards.reduce((sum, card) => sum + card.quantity, 0),
          };
        })
        .filter((section) => section.cards.length > 0);
      return { ...view, sections };
    }
    return {
      ...view,
      cards: filterWantCards(view.cards || [], wantFilters, quotes),
    };
  }, [view, wantFilters, priceSummary]);

  const editionOptions = useMemo(() => {
    const source = view?.grouped
      ? view.sections.flatMap((section) => section.cards)
      : view?.cards || [];
    return [...new Set(source.map((card) => card.setCode).filter(Boolean) as string[])].sort();
  }, [view]);

  const visibleCardsCount =
    (displayedView?.grouped
      ? displayedView.sections.reduce((n, s) => n + s.cards.length, 0)
      : displayedView?.cards?.length) || 0;

  const exportableFilteredCards = useMemo(() => {
    if (displayedView?.grouped && displayedView.sections) {
      return displayedView.sections.flatMap((s) =>
        s.cards.map((c) => ({ cardName: c.cardName, quantity: c.quantity }))
      );
    }
    return (displayedView?.cards || []).map((c) => ({
      cardName: c.cardName,
      quantity: c.quantity,
    }));
  }, [displayedView]);

  const exportableAllCards = useMemo(() => {
    if (view?.grouped && view.sections) {
      return view.sections.flatMap((s) =>
        s.cards.map((c) => ({ cardName: c.cardName, quantity: c.quantity }))
      );
    }
    return (view?.cards || []).map((c) => ({
      cardName: c.cardName,
      quantity: c.quantity,
    }));
  }, [view]);

  function renderCard(card: WantCardDTO) {
    const isBusy = busyId === card.id;
    const requested = card.requestedInDecks || [];
    const requestedCount = card.requestedInDecksCount ?? requested.length;
    const quote =
      priceSummary?.quotes[card.cardScryfallId] ||
      priceSummary?.quotes[normalizeCardName(card.cardName)];

    return (
      <div
        key={card.id}
        className="group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-lg bg-card border-border hover:border-primary/40"
      >
        <div className="space-y-3">
          {/* Header row: category + quantity badge + price badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground truncate max-w-[130px]">
              {card.typeLine ? card.typeLine.split("—")[0].trim() : "Carta"}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-primary shrink-0">
                x{card.quantity}
              </span>
              <PriceBadge quote={quote} showSubtotal={card.quantity > 1} />
            </div>
          </div>

          {/* Full MTG Card Image with aspect ratio 63/88 */}
          <div
            onClick={() => setSelectedCardForDetail(card)}
            className="relative cursor-pointer group/img w-full flex justify-center pt-0.5"
            title="Clic para ver detalles completos"
          >
            <div
              className="relative w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-border/80 group-hover/img:border-primary shadow-md group-hover/img:shadow-xl group-hover/img:scale-[1.02] transition-all duration-200 bg-secondary/30"
              style={{ aspectRatio: "63 / 88" }}
            >
              {card.imageUri ? (
                <Image
                  src={card.imageUri}
                  alt={card.cardName}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                  className="object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                  <span className="text-xs font-semibold">{card.cardName}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                <Eye className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* Card Title & Info */}
          <div className="space-y-1.5">
            <h4
              onClick={() => setSelectedCardForDetail(card)}
              className="font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1 leading-snug"
              title={card.cardName}
            >
              {card.cardName}
            </h4>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[150px]">{card.typeLine || "Card"}</span>
              <ManaCost manaCost={card.manaCost} />
            </div>

            <RequestedDecksBadge
              cardName={card.cardName}
              decks={requested}
              count={requestedCount}
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
          <div className="flex items-center bg-background border border-border rounded-lg p-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={isBusy}
              onClick={() => handleUpdateQty(card.id, card.quantity, -1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="font-mono font-semibold text-xs px-2 text-foreground">
              {card.quantity}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={isBusy}
              onClick={() => handleUpdateQty(card.id, card.quantity, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30"
            disabled={isBusy}
            onClick={() => handleDelete(card.id, card.cardName)}
            title="Eliminar de wants"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-border">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Heart className="h-7 w-7 text-rose-400" />
            Wants
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cartas que quieres conseguir. Pueden estar o no en tus mazos.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportListDialog
            cards={exportableFilteredCards}
            allCards={exportableAllCards}
            title="Exportar Wants"
            fileNamePrefix="wants"
          />
          <CardSearchDialog
            onAddCard={handleAddCard}
            title="Añadir a Wants"
            triggerText="Añadir carta"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Únicas</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {view?.uniqueCards ?? initialStats.uniqueCards}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Copias</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {view?.totalCards ?? initialStats.totalCards}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Mazos</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {initialStats.decksCount ?? 0}
          </p>
        </div>
      </div>

      <PricingProviderSelector
        currentProvider={priceProvider}
        onProviderChange={(p) => setPriceProvider(p)}
        onRefreshPrices={() => loadPrices(priceProvider, true)}
        summary={priceSummary}
        isLoading={isLoadingPrices}
        showMissingNetValue={false}
      />

      <WantsPriceMovers
        provider={priceProvider}
        onSelectCard={(name) => setSearchQuery(name)}
      />

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar carta por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <PriceFilter
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinPriceChange={setMinPrice}
              onMaxPriceChange={setMaxPrice}
              currencySymbol={priceSummary?.currencySymbol || "€"}
            />
            <select
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              aria-label="Edición"
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="">Todas las ediciones</option>
              {editionOptions.map((code) => (
                <option key={code} value={code}>
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              aria-label="Tipo"
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="">Todos los tipos</option>
              {Object.values(CARD_TYPE_GROUPS).map((group) => (
                <option key={group.key} value={group.key}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Colores:</span>
            {COLOR_ORDER.map((color) => {
              const active = selectedColors.includes(color);
              return (
                <Button
                  key={color}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={active}
                  onClick={() => {
                    setColorlessOnly(false);
                    setSelectedColors((current) =>
                      current.includes(color)
                        ? current.filter((item) => item !== color)
                        : [...current, color]
                    );
                  }}
                  className={`h-7 w-7 px-0 text-xs font-mono ${
                    active
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground"
                  }`}
                >
                  {color}
                </Button>
              );
            })}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={colorlessOnly}
              onClick={() => {
                setColorlessOnly((current) => !current);
                setSelectedColors([]);
              }}
              className={`h-7 px-2 text-xs ${
                colorlessOnly
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground"
              }`}
            >
              Incoloro
            </Button>
          </div>
        </div>

        {visibleCardsCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardSortingBar
              currentField={sortField}
              currentDirection={sortDirection}
              onSortChange={(f, d) => {
                setSortField(f);
                setSortDirection(d);
              }}
              showStatusOption={false}
              showRequestedDecksOption
              requestedDecksLabel="Repeticiones"
            />

            {!searchQuery && (
              <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border self-start sm:self-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsGroupedByType(true)}
                  className={`h-7 px-2.5 text-xs gap-1.5 ${
                    isGroupedByType
                      ? "bg-accent text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FolderTree className="h-3.5 w-3.5" />
                  <span>Por Categoría</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsGroupedByType(false)}
                  className={`h-7 px-2.5 text-xs gap-1.5 ${
                    !isGroupedByType
                      ? "bg-accent text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cuadrícula</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {view === null && isLoadingView ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando wants...</p>
        </div>
      ) : displayedView?.grouped && (displayedView.sections?.length ?? 0) > 0 ? (
        <div className="space-y-8">
          {displayedView.sections.map((section) => (
            <div key={section.key} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {section.label}
                  </h2>
                  <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                    {section.totalCards}{" "}
                    {section.totalCards === 1 ? "carta" : "cartas"} (
                    {section.uniqueCards} únicas)
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.cards.map((card) => renderCard(card))}
              </div>
            </div>
          ))}
        </div>
      ) : (displayedView?.cards?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedView!.cards.map((card) => renderCard(card))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-lg border border-dashed border-border bg-card max-w-xl mx-auto">
          <div className="h-16 w-16 mx-auto rounded-lg bg-muted border border-border flex items-center justify-center text-rose-400 mb-4">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {debouncedQuery || minPrice || maxPrice || edition || typeKey || selectedColors.length || colorlessOnly
              ? "Sin resultados"
              : "Tu lista de wants está vacía"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {debouncedQuery
              ? "Prueba con otro término."
              : "Añade cartas desde EDHREC o busca en Scryfall las que aún no tienes."}
          </p>
          {!debouncedQuery && (
            <div className="mt-6 flex items-center justify-center">
              <CardSearchDialog
                onAddCard={handleAddCard}
                title="Añadir a Wants"
                triggerText="Añadir primera carta"
              />
            </div>
          )}
        </div>
      )}

      {selectedCardForDetail && (
        <CardDetailDialog
          isOpen={Boolean(selectedCardForDetail)}
          onOpenChange={(open) => !open && setSelectedCardForDetail(null)}
          cardId={selectedCardForDetail.cardScryfallId}
          cardName={selectedCardForDetail.cardName}
          imageUri={selectedCardForDetail.imageUri}
          manaCost={selectedCardForDetail.manaCost}
          typeLine={selectedCardForDetail.typeLine}
          quantity={selectedCardForDetail.quantity}
          ownedInCollection={0}
          requestedInDecks={selectedCardForDetail.requestedInDecks}
          requestedInDecksCount={selectedCardForDetail.requestedInDecksCount}
        />
      )}
    </div>
  );
}
