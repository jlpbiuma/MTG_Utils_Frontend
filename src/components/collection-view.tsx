"use client";

import { ViewToolbar, ToolbarSearch, ToolbarChoices } from "@/components/view-toolbar";

import { useQueryState, useQueryFlag } from "@/hooks/use-query-state";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { CatalogCardGridItem } from "@/components/catalog-card-grid-item";
import { Library, Plus, Minus, Trash2, FolderTree, LayoutGrid } from "lucide-react";
import { CollectionValueChart } from "@/components/collection-value-chart";
import { DormantCardsTab } from "@/components/dormant-cards-tab";
import { SimulatedCollectionsTab } from "@/components/simulated-collections-tab";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExportListDialog } from "@/components/export-list-dialog";

import { Button } from "@/components/ui/button";
import { PageActions } from "@/components/ui/page-actions";

import { InventoryAcquisitionDialog } from "@/components/inventory-acquisition-dialog";
import { CardSearchDialog } from "@/components/card-search-dialog";
import { ImportCollectionDialog } from "@/components/import-collection-dialog";
import { addOrIncrementCard, updateCollectionQuantity, deleteCollectionCard } from "@/actions/collection";
import type { CollectionCardDTO, CollectionQueryResponse } from "@/actions/collection";
import { PriceSummary } from "@/lib/pricing";
import { PricingSummary } from "@/components/pricing-summary";
import { PriceBadge } from "@/components/price-badge";
import { CardSortingBar } from "@/components/card-sorting-bar";
import { PriceFilter } from "@/components/price-filter";
import { type SortField, type SortDirection } from "@/lib/sorting";
import { COLLECTION_PAGE_SIZE } from "@/lib/page-sizes";
import { normalizeCardName } from "@/lib/card-utils";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import type { CardPrintingDetail } from "@/actions/scryfall";
import { injectPrintingQuote } from "@/lib/printing-quote";
import { RequestedDecksBadge } from "@/components/requested-decks-badge";
import { getCollectionQuery, getCollectionStats } from "@/lib/reads";

interface CollectionViewProps {
  activeTab?: "inventory" | "value-history" | "dormant" | "simulated";
  initialView?: CollectionQueryResponse | null;
  initialStats: { uniqueCards: number; totalCards: number; decksCount?: number };
}

export function CollectionView({
  activeTab = "inventory",
  initialView,
  initialStats,
}: CollectionViewProps) {
  // The whole collection, already filtered/sorted/grouped on the backend.
  const [view, setView] = useState<CollectionQueryResponse | null>(
    initialView ?? null
  );
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [stats, setStats] = useState(initialStats);

  const [searchQuery, setSearchQuery] = useQueryState<string>("q", "");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] =
    useState<CollectionCardDTO | null>(null);

  // View mode state: Flat grid by default, Grouped by category is opt-in.
  // If SSR delivered a grouped view, keep the toggle in sync.
  const [isGroupedByType, setIsGroupedByType] = useQueryFlag("group", initialView?.grouped ?? false);

  // Sorting state
  const [sortField, setSortField] = useQueryState<SortField>("sort", "name", ["name", "cmc", "type", "quantity", "price_trend", "price_subtotal", "requested_decks"]);
  const [sortDirection, setSortDirection] = useQueryState<SortDirection>("direction", "asc", ["asc", "desc"]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Dynamic pricing state
  const priceProvider = "cardmarket" as const;
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);
  // Prices load right after mount on the inventory tab: start in the loading
  // state so the summary never flashes "No se pudieron cargar los precios".
  const [isLoadingPrices, setIsLoadingPrices] = useState(activeTab === "inventory");

  const loadPrices = useCallback(
    async (providerToLoad = priceProvider) => {
      setIsLoadingPrices(true);
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "collection",
            provider: providerToLoad,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.summary) {
            setPriceSummary(json.summary);
          } else {
            setPriceSummary(null);
          }
        } else {
          setPriceSummary(null);
        }
      } catch (err) {
        console.error("Failed to load collection prices:", err);
        setPriceSummary(null);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [priceProvider]
  );

  useEffect(() => {
    if (activeTab === "inventory") {
      loadPrices(priceProvider);
    }
  }, [activeTab, priceProvider, loadPrices]);

  // Debounce the search and price inputs before running the backend query.
  const [debouncedPrices, setDebouncedPrices] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      const parse = (value: string) => {
        const parsed = value.trim() === "" ? NaN : parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      };
      setDebouncedPrices((prev) => {
        const next = { min: parse(minPrice), max: parse(maxPrice) };
        return prev.min === next.min && prev.max === next.max ? prev : next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, minPrice, maxPrice]);

  // Searching preserves the selected grouping, which is supported by the backend.
  const grouped = isGroupedByType;
  const filterKey = `${debouncedQuery}|${debouncedPrices.min}|${debouncedPrices.max}|${sortField}|${sortDirection}|${grouped}`;
  // The page belongs to the filters it was chosen for: a new filter, sort or
  // grouping always starts again at page 1.
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;

  const filterOptions = useMemo(() => ({
    searchQuery: debouncedQuery,
    sort: sortField,
    direction: sortDirection,
    grouped,
    priceProvider,
    minPrice: debouncedPrices.min,
    maxPrice: debouncedPrices.max,
  }), [debouncedQuery, sortField, sortDirection, grouped, priceProvider, debouncedPrices]);

  // Only the latest request may update the view: a slow earlier page must
  // never overwrite a newer one.
  const requestSeqRef = useRef(0);
  const refreshView = useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setIsLoadingView(true);
    try {
      const res = await getCollectionQuery({ ...filterOptions, page, limit: COLLECTION_PAGE_SIZE });
      if (res && seq === requestSeqRef.current) setView(res);
    } catch (err) {
      console.error("Error consultando la colección:", err);
    } finally {
      if (seq === requestSeqRef.current) setIsLoadingView(false);
    }
  }, [filterOptions, page]);

  const refreshStats = useCallback(async () => {
    try {
      const next = await getCollectionStats();
      setStats(next);
    } catch (err) {
      console.error("Error actualizando el resumen de la colección:", err);
    }
  }, []);

  // Keep the view in sync with grouping/sorting/filtering/page changes.
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

  const [acquisition,setAcquisition]=useState<{printingId:string;cardName:string;quantity:number;isFoil?:boolean;adjustment:()=>Promise<void>}|null>(null);
  const handleAddCard = async (cardData: {
    cardScryfallId: string;
    cardName: string;
    quantity: number;
    isFoil?: boolean;
    manaCost?: string | null;
    typeLine?: string | null;
    imageUri?: string | null;
  }) => {
    setAcquisition({printingId:cardData.cardScryfallId,cardName:cardData.cardName,quantity:cardData.quantity,isFoil:cardData.isFoil,adjustment:async()=>{await addOrIncrementCard({
      cardScryfallId: cardData.cardScryfallId,
      cardName: cardData.cardName,
      quantity: cardData.quantity,
      isFoil: cardData.isFoil,
      manaCost: cardData.manaCost,
      typeLine: cardData.typeLine,
      imageUri: cardData.imageUri,
    });}});
  };

  const handleUpdateQty = async (cardId: string, currentQty: number, delta: number) => {
    if(delta>0){const card=[...(view?.cards??[]),...(view?.sections??[]).flatMap(s=>s.cards)].find(c=>c.id===cardId);if(card){setAcquisition({printingId:card.cardScryfallId,cardName:card.cardName,quantity:delta,isFoil:card.isFoil,adjustment:async()=>{await updateCollectionQuantity(cardId,currentQty+delta);}});return;}}
    setBusyId(cardId);
    try {
      const newQty = currentQty + delta;
      await updateCollectionQuantity(cardId, newQty);
      await Promise.all([refreshView(), refreshStats()]);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cardId: string, cardName: string) => {
    if (!confirm(`¿Eliminar "${cardName}" de tu colección física?`)) return;
    setBusyId(cardId);
    try {
      await deleteCollectionCard(cardId);
      await Promise.all([refreshView(), refreshStats()]);
    } finally {
      setBusyId(null);
    }
  };

  const patchCardInView = (
    cardId: string,
    patch: Partial<CollectionCardDTO>,
  ) => {
    setView((prev) => {
      if (!prev) return prev;
      const patchList = (cards: CollectionCardDTO[]) =>
        cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c));
      return {
        ...prev,
        cards: patchList(prev.cards || []),
        sections: (prev.sections || []).map((sec) => ({
          ...sec,
          cards: patchList(sec.cards || []),
        })),
      };
    });
  };

  const handleVersionSelect = async (version: CardPrintingDetail) => {
    if (!selectedCardForDetail) return;
    const newImageUri =
      version.image_uri || version.image_uri_large || version.image_uri_small || null;
    const previousScryfallId = selectedCardForDetail.cardScryfallId;
    patchCardInView(selectedCardForDetail.id, {
      cardScryfallId: version.id,
      imageUri: newImageUri,
      setCode: version.set_code,
      collectorNumber: version.collector_number,
    });
    setSelectedCardForDetail((prev) =>
      prev
        ? {
            ...prev,
            cardScryfallId: version.id,
            imageUri: newImageUri,
            setCode: version.set_code,
            collectorNumber: version.collector_number,
          }
        : null,
    );
    setPriceSummary((prev) =>
      injectPrintingQuote(
        prev,
        version,
        selectedCardForDetail.cardName,
        selectedCardForDetail.quantity,
        priceProvider,
        previousScryfallId,
      ),
    );
  };

  const hasPriceFilter = debouncedPrices.min !== null || debouncedPrices.max !== null;

  // The backend returns exactly one page, whatever the mode.
  const paginatedFlatCards = view?.cards ?? [];
  const paginatedSections = view?.sections ?? [];
  const pageSize = view?.limit ?? COLLECTION_PAGE_SIZE;
  const totalCardsToPaginate = view?.uniqueCards ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCardsToPaginate / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, view?.page ?? page), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCardsToPaginate);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (newPage: number) => {
    setPageState({ key: filterKey, page: newPage });
    gridContainerRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Exports cover every page: the filtered result and the whole inventory.
  const loadExportCards = useCallback(async () => {
    const toItems = (res: CollectionQueryResponse | null | undefined) =>
      [...(res?.cards ?? []), ...(res?.sections ?? []).flatMap((section) => section.cards)].map((c) => ({
        cardName: c.cardName,
        quantity: c.quantity,
      }));
    const [filtered, all] = await Promise.all([
      getCollectionQuery({ ...filterOptions, grouped: false }),
      getCollectionQuery({ sort: "name", direction: "asc", grouped: false, priceProvider }),
    ]);
    return { current: toItems(filtered), all: toItems(all) };
  }, [filterOptions, priceProvider]);

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

        <PageActions>
          <ExportListDialog
            loadCards={loadExportCards}
            title="Exportar Colección"
            fileNamePrefix="coleccion"
          />
          <ImportCollectionDialog />
          <CardSearchDialog
            onAddCard={handleAddCard}
            title="Añadir a mi Colección"
            triggerText="Añadir cartas"
          />
        </PageActions>
      </div>

      <p className="flex flex-wrap gap-4 text-sm text-muted-foreground" aria-label="Resumen de inventario"><span><strong className="text-foreground">{stats.uniqueCards}</strong> cartas únicas</span><span><strong className="text-foreground">{stats.totalCards}</strong> copias</span><span><strong className="text-foreground">{stats.decksCount ?? 0}</strong> mazos</span></p>

      {/* Tab panels — nav lives in collection layout as subroutes */}
      {activeTab === "inventory" ? (
        <div className="space-y-6">
          {/* Dynamic Pricing Selector & Total Collection Value */}
          <PricingSummary

        summary={priceSummary}
        isLoading={isLoadingPrices}
        showMissingNetValue={false}
      />

      <ViewToolbar
        label="Opciones del inventario"
        activeFilters={[hasPriceFilter, sortField !== "name" || sortDirection !== "asc", isGroupedByType].filter(Boolean).length}
        search={
          <ToolbarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Filtrar cartas de tu colección por nombre..."
          />
        }
        filters={
          <PriceFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            currencySymbol={priceSummary?.currencySymbol || "€"}
          />
        }
        sorting={
          <CardSortingBar
            currentField={sortField}
            currentDirection={sortDirection}
            onSortChange={(field, direction) => {
              setSortField(field);
              setSortDirection(direction);
            }}
            showRequestedDecksOption
          />
        }
        display={
          <ToolbarChoices
            label="Vista"
            value={isGroupedByType ? "type" : "grid"}
            onChange={(value) => setIsGroupedByType(value === "type")}
            options={[
              {
                value: "type",
                label: "Por Categoría",
                icon: <FolderTree className="h-3.5 w-3.5" />,
              },
              { value: "grid", label: "Cuadrícula", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />

      {/* Card Grid / List */}
      <div ref={gridContainerRef} />
      {view !== null && isLoadingView && (
        <p className="text-xs text-muted-foreground" role="status">Actualizando resultados…</p>
      )}
      {view === null && isLoadingView ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Procesando tu colección...</p>
        </div>
      ) : isGroupedByType && paginatedSections.length > 0 ? (
        /* One backend page of the section-ordered, filtered collection */
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
        /* One backend page of the filtered, sorted collection */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedFlatCards.map((card) => renderCard(card))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-lg border border-dashed border-border bg-card max-w-xl mx-auto">
          <div className="h-16 w-16 mx-auto rounded-lg bg-muted border border-border flex items-center justify-center text-primary mb-4">
            <Library className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {debouncedQuery || hasPriceFilter
              ? "Sin resultados para los filtros seleccionados"
              : "Tu colección está vacía"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {debouncedQuery || hasPriceFilter
              ? "Prueba modificando el término de búsqueda o ajustando el rango de precio."
              : "Busca cartas en la base de datos de Scryfall e introduce el número de copias que tienes."}
          </p>
          {(debouncedQuery || hasPriceFilter) && (
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
              {hasPriceFilter && (
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
          {!debouncedQuery && !hasPriceFilter && (
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
        </div>
      ) : null}

      {activeTab === "value-history" ? (
        <CollectionValueChart provider={priceProvider} />
      ) : null}

      {activeTab === "dormant" ? (
        <DormantCardsTab provider={priceProvider} />
      ) : null}

      {activeTab === "simulated" ? (
        <SimulatedCollectionsTab />
      ) : null}

      {acquisition && <InventoryAcquisitionDialog {...acquisition} onAdjustment={acquisition.adjustment} onSaved={refreshView} onClose={()=>setAcquisition(null)}/> }
      {selectedCardForDetail && (
        <CardDetailDialog
          key={selectedCardForDetail.id}
          isOpen={Boolean(selectedCardForDetail)}
          onOpenChange={(open) => !open && setSelectedCardForDetail(null)}
          cardId={selectedCardForDetail.cardScryfallId}
          cardName={selectedCardForDetail.cardName}
          imageUri={selectedCardForDetail.imageUri}
          manaCost={selectedCardForDetail.manaCost}
          typeLine={selectedCardForDetail.typeLine}
          quantity={selectedCardForDetail.quantity}
          ownedInCollection={selectedCardForDetail.quantity}
          collectionCardId={selectedCardForDetail.id}
          acquiredAt={selectedCardForDetail.acquiredAt}
          onAcquiredAtChange={(acquiredAt) => {
            patchCardInView(selectedCardForDetail.id, { acquiredAt });
            setSelectedCardForDetail((card) => card ? { ...card, acquiredAt } : card);
          }}
          onVersionSelect={handleVersionSelect}
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
      <CatalogCardGridItem key={card.id} name={card.cardName} imageUri={card.imageUri} typeLine={card.typeLine} manaCost={card.manaCost} isFoil={card.isFoil} onOpen={() => setSelectedCardForDetail(card)} badges={<>
        <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-primary shrink-0 flex items-center gap-1">x{card.quantity}{card.isFoil && <span className="text-[10px] text-amber-400 font-bold">★ Foil</span>}</span>
        <PriceBadge quote={quote} showSubtotal={card.quantity > 1} />
      </>} footer={
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
      }>
        <RequestedDecksBadge cardName={card.cardName} decks={card.requestedInDecks} count={card.requestedInDecksCount} />
      </CatalogCardGridItem>
    );
  }
}
