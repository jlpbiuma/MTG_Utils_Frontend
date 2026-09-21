"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CardImage as Image } from "@/components/card-image";
import {
  Library,
  Search,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  FolderTree,
  LayoutGrid,
  TrendingUp,
  Moon,
  FlaskConical,
  Eye,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CollectionValueChart } from "@/components/collection-value-chart";
import { DormantCardsTab } from "@/components/dormant-cards-tab";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExportListDialog } from "@/components/export-list-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { CardSearchDialog } from "@/components/card-search-dialog";
import { ImportCollectionDialog } from "@/components/import-collection-dialog";
import {
  addOrIncrementCard,
  updateCollectionQuantity,
  deleteCollectionCard,
  getCollectionQuery,
} from "@/actions/collection";
import type {
  CollectionCardDTO,
  CollectionQueryResponse,
} from "@/actions/collection";
import { PriceProvider, PriceSummary } from "@/lib/pricing";
import { PricingProviderSelector } from "@/components/pricing-provider-selector";
import { PriceBadge } from "@/components/price-badge";
import { CardSortingBar } from "@/components/card-sorting-bar";
import { PriceFilter } from "@/components/price-filter";
import { matchesPriceFilter, type SortField, type SortDirection } from "@/lib/sorting";
import {
  triggerWeeklyCollectionPricing,
  getCollectionPricesLastUpdated,
} from "@/actions/pricing";
import { normalizeCardName } from "@/lib/card-utils";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { RequestedDecksBadge } from "@/components/requested-decks-badge";

interface CollectionViewProps {
  initialView?: CollectionQueryResponse | null;
  initialStats: { uniqueCards: number; totalCards: number; decksCount?: number };
}

export function CollectionView({ initialView, initialStats }: CollectionViewProps) {
  // The whole collection, already filtered/sorted/grouped on the backend.
  const [view, setView] = useState<CollectionQueryResponse | null>(
    initialView ?? null
  );
  const [isLoadingView, setIsLoadingView] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] =
    useState<CollectionCardDTO | null>(null);

  // View mode state: Flat grid by default, Grouped by category is opt-in.
  // If SSR delivered a grouped view, keep the toggle in sync.
  const [isGroupedByType, setIsGroupedByType] = useState(
    initialView?.grouped ?? false
  );

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Weekly pricing refresh state
  const [isUpdatingWeeklyPrices, setIsUpdatingWeeklyPrices] = useState(false);
  const [lastPricesUpdate, setLastPricesUpdate] = useState<string | null>(null);

  useEffect(() => {
    getCollectionPricesLastUpdated().then(setLastPricesUpdate);
  }, []);

  // Dynamic pricing state
  const [priceProvider, setPriceProvider] = useState<PriceProvider>("cardmarket");
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const loadPrices = useCallback(
    async (providerToLoad = priceProvider, bypassCache = false) => {
      setIsLoadingPrices(true);
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "collection",
            provider: providerToLoad,
            bypassCache,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.summary) {
            setPriceSummary(json.summary);
          }
        }
      } catch (err) {
        console.error("Failed to load collection prices:", err);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [priceProvider]
  );

  useEffect(() => {
    loadPrices(priceProvider, false);
  }, [priceProvider, loadPrices]);

  // Debounce the search input before running the backend query.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Grouping is reported to the backend; a search always renders flat results.
  const grouped = isGroupedByType && !debouncedQuery;

  const refreshView = useCallback(async () => {
    const options = {
      searchQuery: debouncedQuery,
      sort: sortField,
      direction: sortDirection,
      grouped,
      priceProvider,
    };
    setIsLoadingView(true);
    try {
      const res = await getCollectionQuery(options);
      if (res) setView(res);
    } catch (err) {
      console.error("Error consultando la colección:", err);
    } finally {
      setIsLoadingView(false);
    }
  }, [debouncedQuery, sortField, sortDirection, grouped, priceProvider]);

  // Keep the view in sync with grouping/sorting/filtering/provider changes.
  // The initial render already carries the same backend-processed result, so
  // we only re-query when the parameters change or SSR delivered no data.
  const skippedInitialRef = useRef(false);
  useEffect(() => {
    if (!skippedInitialRef.current) {
      skippedInitialRef.current = true;
      if (initialView != null) return;
    }
    refreshView();
  }, [refreshView, initialView]);

  const handleAddCard = async (cardData: {
    cardScryfallId: string;
    cardName: string;
    quantity: number;
    isFoil?: boolean;
    manaCost?: string | null;
    typeLine?: string | null;
    imageUri?: string | null;
  }) => {
    await addOrIncrementCard({
      cardScryfallId: cardData.cardScryfallId,
      cardName: cardData.cardName,
      quantity: cardData.quantity,
      manaCost: cardData.manaCost,
      typeLine: cardData.typeLine,
      imageUri: cardData.imageUri,
    });
    await refreshView();
  };

  const handleUpdateQty = async (cardId: string, currentQty: number, delta: number) => {
    setBusyId(cardId);
    try {
      const newQty = currentQty + delta;
      await updateCollectionQuantity(cardId, newQty);
      await refreshView();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cardId: string, cardName: string) => {
    if (!confirm(`¿Eliminar "${cardName}" de tu colección física?`)) return;
    setBusyId(cardId);
    try {
      await deleteCollectionCard(cardId);
      await refreshView();
    } finally {
      setBusyId(null);
    }
  };

  const handleRunWeeklyWorker = async () => {
    setIsUpdatingWeeklyPrices(true);
    try {
      const res = await triggerWeeklyCollectionPricing();
      if (res.success) {
        setLastPricesUpdate(res.timestamp);
        await loadPrices(priceProvider, true);
        alert(`¡Precios actualizados! Se sincronizaron ${res.updatedCatalogCount} cartas en la base de datos.`);
      } else {
        alert("El worker finalizó con algunos avisos.");
      }
    } catch (err: any) {
      alert("Error ejecutando el worker de precios: " + (err?.message || err));
    } finally {
      setIsUpdatingWeeklyPrices(false);
    }
  };

  const parsedMinPrice = minPrice.trim() !== "" ? parseFloat(minPrice) : null;
  const parsedMaxPrice = maxPrice.trim() !== "" ? parseFloat(maxPrice) : null;
  const hasPriceFilter = parsedMinPrice !== null || parsedMaxPrice !== null;

  const displaySections = useMemo(() => {
    if (!view?.sections) return [];
    if (!hasPriceFilter) return view.sections;
    return view.sections
      .map((sec) => {
        const matchingCards = sec.cards.filter((card) =>
          matchesPriceFilter(
            card.cardName,
            card.cardScryfallId,
            parsedMinPrice,
            parsedMaxPrice,
            priceSummary?.quotes
          )
        );
        return {
          ...sec,
          cards: matchingCards,
          totalCards: matchingCards.reduce((acc, c) => acc + c.quantity, 0),
          uniqueCards: matchingCards.length,
          sectionTotalPrice: matchingCards.reduce((acc, c) => {
            const q =
              priceSummary?.quotes[c.cardScryfallId] ||
              priceSummary?.quotes[normalizeCardName(c.cardName)];
            const p = q?.unitPrice?.trend ?? q?.subtotal ?? 0;
            return acc + p * c.quantity;
          }, 0),
        };
      })
      .filter((sec) => sec.cards.length > 0);
  }, [view?.sections, hasPriceFilter, parsedMinPrice, parsedMaxPrice, priceSummary?.quotes]);

  const displayFlatCards = useMemo(() => {
    if (!view?.cards) return [];
    if (!hasPriceFilter) return view.cards;
    return view.cards.filter((card) =>
      matchesPriceFilter(
        card.cardName,
        card.cardScryfallId,
        parsedMinPrice,
        parsedMaxPrice,
        priceSummary?.quotes
      )
    );
  }, [view?.cards, hasPriceFilter, parsedMinPrice, parsedMaxPrice, priceSummary?.quotes]);

  const visibleCardsCount = isGroupedByType && view?.sections?.length
    ? displaySections.reduce((sum: number, s) => sum + s.cards.length, 0)
    : displayFlatCards.length;

  // Pagination state (limit to 200 cards per page)
  const ITEMS_PER_PAGE = 200;
  const [currentPage, setCurrentPage] = useState(1);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, minPrice, maxPrice, sortField, sortDirection, isGroupedByType]);

  const totalCardsToPaginate = isGroupedByType && view?.sections?.length
    ? visibleCardsCount
    : displayFlatCards.length;

  const totalPages = Math.max(1, Math.ceil(totalCardsToPaginate / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalCardsToPaginate);

  const paginatedFlatCards = useMemo(() => {
    return displayFlatCards.slice(startIndex, endIndex);
  }, [displayFlatCards, startIndex, endIndex]);

  const allSectionCards = useMemo(() => {
    if (!isGroupedByType || !displaySections.length) return [];
    return displaySections.flatMap((s) =>
      s.cards.map((c) => ({
        card: c,
        sectionKey: s.key,
        sectionLabel: s.label,
        sectionOrder: s.order,
        currencySymbol: s.currencySymbol,
      }))
    );
  }, [isGroupedByType, displaySections]);

  const paginatedSections = useMemo(() => {
    if (!isGroupedByType || !displaySections.length) return [];
    const pageItems = allSectionCards.slice(startIndex, endIndex);

    const sectionMap = new Map<
      string,
      {
        key: string;
        label: string;
        order: number;
        currencySymbol: string;
        totalCards: number;
        uniqueCards: number;
        sectionTotalPrice: number;
        cards: CollectionCardDTO[];
      }
    >();

    const originalSectionsMap = new Map(displaySections.map((s) => [s.key, s]));

    for (const item of pageItems) {
      if (!sectionMap.has(item.sectionKey)) {
        const orig = originalSectionsMap.get(item.sectionKey);
        sectionMap.set(item.sectionKey, {
          key: item.sectionKey,
          label: item.sectionLabel,
          order: item.sectionOrder,
          currencySymbol: item.currencySymbol,
          totalCards: orig?.totalCards ?? item.card.quantity,
          uniqueCards: orig?.uniqueCards ?? 1,
          sectionTotalPrice: orig?.sectionTotalPrice ?? 0,
          cards: [],
        });
      }
      sectionMap.get(item.sectionKey)!.cards.push(item.card);
    }

    return Array.from(sectionMap.values()).sort((a, b) => a.order - b.order);
  }, [isGroupedByType, displaySections, allSectionCards, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    gridContainerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const exportableFilteredCards = useMemo(() => {
    if (isGroupedByType && displaySections.length > 0) {
      return displaySections.flatMap((s) =>
        s.cards.map((c) => ({ cardName: c.cardName, quantity: c.quantity }))
      );
    }
    return displayFlatCards.map((c) => ({
      cardName: c.cardName,
      quantity: c.quantity,
    }));
  }, [isGroupedByType, displaySections, displayFlatCards]);

  const exportableAllCards = useMemo(() => {
    if (view?.sections && view.sections.length > 0) {
      return view.sections.flatMap((s) =>
        s.cards.map((c) => ({ cardName: c.cardName, quantity: c.quantity }))
      );
    }
    if (view?.cards && view.cards.length > 0) {
      return view.cards.map((c) => ({
        cardName: c.cardName,
        quantity: c.quantity,
      }));
    }
    return [];
  }, [view]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-border">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Colección
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">
            Inventario físico contrastado con tus mazos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportListDialog
            cards={exportableFilteredCards}
            allCards={exportableAllCards}
            title="Exportar Colección"
            fileNamePrefix="coleccion"
          />
          <ImportCollectionDialog />
          <CardSearchDialog
            onAddCard={handleAddCard}
            title="Añadir a mi Colección"
            triggerText="Añadir cartas"
          />
        </div>
      </div>

      {/* KPI Stats matching Swift KPIStripView */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Únicas</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {initialStats.uniqueCards}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Copias</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {initialStats.totalCards}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Mazos</p>
          <p className="text-2xl font-medium text-foreground font-mono mt-1 tracking-tight">
            {initialStats.decksCount ?? 0}
          </p>
        </div>
      </div>

      {/* Tabs for Collection sections */}
      <Tabs defaultValue="inventory" className="w-full space-y-6">
        <TabsList className="bg-secondary/70 p-1 border border-border">
          <TabsTrigger value="inventory" className="gap-2">
            <Library className="h-4 w-4" />
            <span>Inventario</span>
          </TabsTrigger>
          <TabsTrigger value="value-history" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Evolución de Valor</span>
          </TabsTrigger>
          <TabsTrigger value="dormant" className="gap-2">
            <Moon className="h-4 w-4" />
            <span>Cartas Dormidas</span>
          </TabsTrigger>
          <TabsTrigger value="simulated" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            <span>Colecciones Simuladas</span>
          </TabsTrigger>
        </TabsList>


        <TabsContent value="inventory" className="space-y-6 mt-0">
          {/* Dynamic Pricing Selector & Total Collection Value */}
          <PricingProviderSelector
        currentProvider={priceProvider}
        onProviderChange={(p) => setPriceProvider(p)}
        onRefreshPrices={() => loadPrices(priceProvider, true)}
        summary={priceSummary}
        isLoading={isLoadingPrices}
        showMissingNetValue={false}
      />

      {/* Weekly pricing sync banner & controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>
            {lastPricesUpdate ? (
              <>
                Última sincronización semanal de precios:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(lastPricesUpdate).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            ) : (
              "Sincronización semanal automática activa (actualización periódica de mercado)."
            )}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRunWeeklyWorker}
          disabled={isUpdatingWeeklyPrices}
          className="h-7 text-xs border-border text-primary hover:bg-accent hover:text-accent-foreground gap-1.5 shrink-0"
        >
          {isUpdatingWeeklyPrices ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Sincronizando precios...</span>
            </>
          ) : (
            <span>🔄 Sincronizar Precios Semanales Ahora</span>
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar cartas de tu colección por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 text-base"
            />
          </div>
          <PriceFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            currencySymbol={priceSummary?.currencySymbol || "€"}
            className="self-start sm:self-auto h-11"
          />
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
                  title="Agrupar por categoría MTG (Criaturas, Tierras, etc.)"
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
                  title="Ver cuadrícula continua sin agrupar"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cuadrícula</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Grid / List */}
      <div ref={gridContainerRef} />
      {view === null && isLoadingView ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Procesando tu colección...</p>
        </div>
      ) : isGroupedByType && paginatedSections.length > 0 ? (
        /* Categorized sections computed over the filtered collection (paginated to 200 cards max) */
        <div className="space-y-8">
          {paginatedSections.map((section) => (
            <div key={section.key} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{section.label}</h2>
                  <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                    {section.totalCards} {section.totalCards === 1 ? "carta" : "cartas"} ({section.uniqueCards} únicas)
                  </span>
                </div>
                {section.sectionTotalPrice > 0 && (
                  <span className="text-xs font-mono font-semibold text-primary">
                    {section.sectionTotalPrice.toFixed(2)} {section.currencySymbol}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.cards.map((card) => renderCard(card))}
              </div>
            </div>
          ))}
        </div>
      ) : !isGroupedByType && paginatedFlatCards.length > 0 ? (
        /* Flat grid mode (also used while searching, paginated to 200 cards max) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedFlatCards.map((card) => renderCard(card))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-lg border border-dashed border-border bg-card max-w-xl mx-auto">
          <div className="h-16 w-16 mx-auto rounded-lg bg-muted border border-border flex items-center justify-center text-primary mb-4">
            <Library className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {debouncedQuery || minPrice || maxPrice
              ? "Sin resultados para los filtros seleccionados"
              : "Tu colección está vacía"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {debouncedQuery || minPrice || maxPrice
              ? "Prueba modificando el término de búsqueda o ajustando el rango de precio."
              : "Busca cartas en la base de datos de Scryfall e introduce el número de copias que tienes."}
          </p>
          {(debouncedQuery || minPrice || maxPrice) && (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              {debouncedQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="text-xs"
                >
                  Limpiar búsqueda
                </Button>
              )}
              {(minPrice || maxPrice) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                  }}
                  className="text-xs text-primary"
                >
                  Limpiar filtro de precio
                </Button>
              )}
            </div>
          )}
          {!debouncedQuery && !minPrice && !maxPrice && (
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <ImportCollectionDialog />
              <CardSearchDialog
                onAddCard={handleAddCard}
                title="Añadir a mi Colección"
                triggerText="Añadir primera carta"
              />
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {view && totalCardsToPaginate > 0 && (
        <PaginationControls
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalCards={totalCardsToPaginate}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={handlePageChange}
        />
      )}
        </TabsContent>

        <TabsContent value="value-history" className="mt-0">
          <CollectionValueChart provider={priceProvider} />
        </TabsContent>

        <TabsContent value="dormant" className="mt-0">
          <DormantCardsTab provider={priceProvider} />
        </TabsContent>

        <TabsContent value="simulated" className="mt-0">
          <SimulatedCollectionsTab provider={priceProvider} />
        </TabsContent>
      </Tabs>


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
          ownedInCollection={selectedCardForDetail.quantity}
        />
      )}
    </div>
  );

  function renderCard(card: CollectionCardDTO) {
    const isBusy = busyId === card.id;
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
              <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-primary shrink-0 flex items-center gap-1">
                x{card.quantity}
                {card.isFoil && <span className="text-[10px] text-amber-400 font-bold">★ Foil</span>}
              </span>
              <PriceBadge quote={quote} showSubtotal={card.quantity > 1} />
            </div>
          </div>

          {/* Full MTG Card Image with aspect ratio 63/88 */}
          <div
            onClick={() => setSelectedCardForDetail(card)}
            className="relative cursor-pointer group/img w-full flex justify-center pt-0.5"
            title="Ver todos los datos en español"
          >
            <div
              className={`relative w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-border/80 group-hover/img:border-primary shadow-md group-hover/img:shadow-xl group-hover/img:scale-[1.02] transition-all duration-200 bg-secondary/30 ${
                card.isFoil ? "foil-card-effect" : ""
              }`}
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
                  <span className="text-xs">Sin imagen</span>
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
              decks={card.requestedInDecks}
              count={card.requestedInDecksCount}
            />
          </div>
        </div>

        {/* Quantity Controls & Delete */}
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
            title="Eliminar de colección"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }
}