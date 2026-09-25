"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  ArrowRightLeft,
  ExternalLink,
  ShoppingCart,
  Coins,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  List,
  LayoutGrid,
  Heart,
  Check,
  Loader2,
  TrendingUp,
  Eye,
} from "lucide-react";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { formatPrice } from "@/lib/deck-colors";
import { getCardCategory } from "@/lib/card-utils";
import {
  getPriorities,
  reassignCardBetweenDecks,
  type PriorityItem,
  type PrioritiesResponse,
  type DeckReassignOption,
} from "@/actions/priorities";
import { addOrIncrementWant } from "@/actions/wants";
import { GoldenWantsTab } from "@/components/golden-wants-tab";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";

const CARD_TYPES = [
  { value: "all", label: "Todos los tipos" },
  { value: "creatures", label: "Criaturas" },
  { value: "lands", label: "Tierras" },
  { value: "instants", label: "Instantáneos" },
  { value: "sorceries", label: "Conjuros" },
  { value: "artifacts", label: "Artefactos" },
  { value: "enchantments", label: "Encantamientos" },
  { value: "planeswalkers", label: "Planeswalkers" },
  { value: "other", label: "Otros tipos" },
];

interface PrioritiesViewProps {
  initialData: PrioritiesResponse;
  activeTab?: "table" | "golden-wants";
}

export function PrioritiesView({
  initialData,
  activeTab = "table",
}: PrioritiesViewProps) {
  const [data, setData] = useState<PrioritiesResponse>(initialData);
  const [sortMode, setSortMode] = useState<"demand" | "impact" | "completion" | "price_opportunity">("demand");
  const [reassignableOnly, setReassignableOnly] = useState<boolean>(false);
  const [hideOwned, setHideOwned] = useState<boolean>(true);
  const [cardType, setCardType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading & Pagination states (100 cards per page)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(initialData.page || 1);

  // Modal states
  const [selectedDecksModalItem, setSelectedDecksModalItem] = useState<PriorityItem | null>(null);
  const [reassignModalItem, setReassignModalItem] = useState<PriorityItem | null>(null);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<PriorityItem | null>(null);
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Wants addition state
  const [addedWants, setAddedWants] = useState<Record<string, boolean>>({});
  const [loadingWantId, setLoadingWantId] = useState<string | null>(null);

  // Reload data from backend when primary filters change
  const reloadData = useCallback(
    async (
      newSort = sortMode,
      newReassignable = reassignableOnly,
      newHideOwned = hideOwned,
      newCardType = cardType
    ) => {
      setIsLoading(true);
      try {
        const res = await getPriorities({
          sort: newSort,
          reassignableOnly: newReassignable,
          hideOwned: newHideOwned,
          cardType: newCardType === "all" ? undefined : newCardType,
          page: 1,
          limit: 100,
          provider: data.provider,
        });
        setData(res);
        setPage(1);
      } catch (err) {
        console.error("Error cargando prioridades:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [sortMode, reassignableOnly, hideOwned, cardType, data.provider]
  );

  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (newPage === page || newPage < 1) return;
      setIsLoading(true);
      try {
        const res = await getPriorities({
          sort: sortMode,
          reassignableOnly,
          hideOwned,
          cardType: cardType === "all" ? undefined : cardType,
          page: newPage,
          limit: 100,
          provider: data.provider,
        });
        setData(res);
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        console.error("Error cambiando página de prioridades:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, sortMode, reassignableOnly, hideOwned, cardType, data.provider]
  );

  // Filter change handler
  const handleFilterChange = (
    newSort: "demand" | "impact" | "completion" | "price_opportunity",
    newReassignable: boolean,
    newHideOwned: boolean,
    newCardType: string
  ) => {
    setSortMode(newSort);
    setReassignableOnly(newReassignable);
    setHideOwned(newHideOwned);
    setCardType(newCardType);
    reloadData(newSort, newReassignable, newHideOwned, newCardType);
  };

  const handleExecuteReassign = async (option: DeckReassignOption) => {
    setIsReassigning(true);
    try {
      await reassignCardBetweenDecks(option.targetDeckCardId, option.sourceDeckId, 1);
      setReassignModalItem(null);
      await reloadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error reasignando carta");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleAddToWants = async (item: PriorityItem) => {
    setLoadingWantId(item.cardScryfallId);
    try {
      await addOrIncrementWant({
        cardScryfallId: item.cardScryfallId,
        cardName: item.cardName,
        quantity: 1,
        manaCost: item.manaCost,
        typeLine: item.typeLine,
        imageUri: item.imageUri,
      });
      setAddedWants((prev) => ({ ...prev, [item.cardScryfallId]: true }));
    } catch (err) {
      console.error("Error añadiendo a wants:", err);
    } finally {
      setLoadingWantId(null);
    }
  };

  // Client-side search and filtering for instant responsiveness
  const filteredItems = useMemo(() => {
    let items = data.items;
    if (hideOwned && !reassignableOnly) {
      items = items.filter((item) => item.copiesOwned === 0);
    }
    if (cardType !== "all") {
      items = items.filter(
        (item) => (item.cardType || getCardCategory(item.typeLine, item.cardName)).toLowerCase() === cardType.toLowerCase()
      );
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      items = items.filter((item) => item.cardName.toLowerCase().includes(q));
    }
    return items;
  }, [data.items, hideOwned, reassignableOnly, cardType, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Gestión Estratégica de Adquisición</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Prioridades de Compra
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Cruza la demanda real de todos tus mazos con tu inventario físico, identificando el déficit real, la versión con el precio más barato disponible y la ganancia de completitud neta global.
          </p>
        </div>

        {/* Global KPI counters */}
        <div className="flex items-center gap-3 bg-secondary/60 p-3 rounded-xl border border-border shrink-0">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
              Coste Total Déficit
            </p>
            <p className="text-xl font-bold font-mono text-primary">
              {formatPrice(data.totalDeficitCost, data.currencySymbol)}
            </p>
          </div>
          <div className="h-8 w-[1px] bg-border" />
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
              Copias Faltantes
            </p>
            <p className="text-xl font-bold font-mono text-foreground">
              {data.totalDeficitCopies}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: Table/Grid vs Golden Wants — routed as subpaths */}
      <div className="space-y-6">
        <div
          role="tablist"
          className="inline-flex h-10 items-center justify-center rounded-md bg-secondary p-1 border border-border text-muted-foreground gap-1"
        >
          <Link
            href="/priorities"
            role="tab"
            aria-selected={activeTab === "table"}
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "table"
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Prioridades de Cartas</span>
            <Badge variant="outline" className="ml-1 text-xs bg-background">
              {data.totalItems || filteredItems.length}
            </Badge>
          </Link>
          <Link
            href="/priorities/golden-wants"
            role="tab"
            aria-selected={activeTab === "golden-wants"}
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === "golden-wants"
                ? "bg-amber-400 text-amber-950 shadow-sm"
                : "text-amber-300 hover:bg-background/50"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Golden Wants (Optimizador Presupuesto)</span>
          </Link>
        </div>

        {activeTab === "table" ? (
          <div className="space-y-6">
          {/* Controls Bar: Search, Filters, Sort, Card Type, and View Mode Toggle */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Buscar carta en prioridades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Card Type Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-secondary/80 px-2.5 py-1.5 rounded-lg border border-border text-xs">
                <span className="text-muted-foreground font-medium">Tipo:</span>
                <select
                  value={cardType}
                  onChange={(e) => handleFilterChange(sortMode, reassignableOnly, hideOwned, e.target.value)}
                  className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none font-medium"
                >
                  {CARD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle: Table vs Grid */}
              <div className="flex items-center bg-secondary p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === "table"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista en tabla"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-all ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista en cuadrícula"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Hide Owned (Active by default!) */}
              <Button
                size="sm"
                variant={hideOwned ? "default" : "outline"}
                onClick={() => handleFilterChange(sortMode, reassignableOnly, !hideOwned, cardType)}
                className="h-9 text-xs gap-1.5 border-border"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Ocultar en colección</span>
              </Button>

              {/* Filter Reassignable */}
              <Button
                size="sm"
                variant={reassignableOnly ? "default" : "outline"}
                onClick={() => handleFilterChange(sortMode, !reassignableOnly, hideOwned, cardType)}
                className="h-9 text-xs gap-1.5 border-border"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Reasignables</span>
              </Button>

              {/* Sort Selector */}
              <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-border text-xs">
                <span className="text-muted-foreground px-2 font-medium">Ordenar:</span>
                <button
                  type="button"
                  onClick={() => handleFilterChange("demand", reassignableOnly, hideOwned, cardType)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    sortMode === "demand"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Nº Mazos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("impact", reassignableOnly, hideOwned, cardType)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    sortMode === "impact"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Impacto (€)
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("completion", reassignableOnly, hideOwned, cardType)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    sortMode === "completion"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Casi completos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterChange("price_opportunity", reassignableOnly, hideOwned, cardType)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${sortMode === "price_opportunity" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Oportunidad de precio
                </button>
              </div>
            </div>
          </div>

          {/* Content: Empty State vs Table View vs Grid View */}
          {isLoading && filteredItems.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando prioridades con cotizaciones más baratas...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-foreground">
                {reassignableOnly
                  ? "No hay cartas con oportunidad de reasignación"
                  : "¡No tienes cartas pendientes según los filtros actuales!"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {hideOwned
                  ? "Las cartas que ya posees en tu colección están ocultas. Desactiva el filtro si deseas verlas."
                  : "Todas las cartas requeridas por tus mazos están cubiertas en tu inventario."}
              </p>
            </div>
          ) : viewMode === "table" ? (
            /* ========================================================================= */
            /* TABLE VIEW: Fixed-height rows with memory-optimized rendering             */
            /* ========================================================================= */
            <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
              <table className="w-full text-left text-sm border-collapse min-w-[980px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-xs font-semibold text-muted-foreground">
                    <th className="py-3 px-4">Carta</th>
                    <th className="py-3 px-3 text-center">Nº Mazos</th>
                    <th className="py-3 px-3 text-center">% Neto Total</th>
                    <th className="py-3 px-3 text-center">Tienes</th>
                    <th className="py-3 px-3 text-center">Necesitas</th>
                    <th className="py-3 px-3 text-center">Déficit</th>
                    <th className="py-3 px-4 text-right">Precio (Mín)</th>
                    <th className="py-3 px-4 text-right">Coste Déficit</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const searchUrl = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                      item.cardName
                    )}`;
                    const isAddedToWants = addedWants[item.cardScryfallId];

                    return (
                      <tr
                        key={item.cardScryfallId}
                        style={{ contentVisibility: "auto", containIntrinsicSize: "70px" } as React.CSSProperties}
                        className="hover:bg-secondary/30 transition-colors group"
                      >
                        {/* Carta */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setSelectedCardForDetail(item)}
                              className="relative w-10 h-14 rounded overflow-hidden border border-border shrink-0 bg-background cursor-pointer hover:ring-2 hover:ring-primary/50 hover:opacity-90 transition-all"
                              title={`Ver detalles de ${item.cardName}`}
                            >
                              {item.imageUri ? (
                                <Image
                                  src={item.imageUri}
                                  alt={item.cardName}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                                  MTG
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                onClick={() => setSelectedCardForDetail(item)}
                                className="cursor-pointer inline-block"
                                title={`Ver detalles de ${item.cardName}`}
                              >
                                <CardPreviewHover
                                  cardName={item.cardName}
                                  imageUri={item.imageUri}
                                >
                                  <span
                                    onClick={() => setSelectedCardForDetail(item)}
                                    className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                                  >
                                    {item.cardName}
                                  </span>
                                </CardPreviewHover>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="truncate max-w-[120px]">
                                  {item.typeLine || "Card"}
                                </span>
                                <ManaCost manaCost={item.manaCost} />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Nº Mazos (Clickable to open modal with all decks) */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDecksModalItem(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-primary/15 border border-border hover:border-primary/40 text-foreground transition-all group/btn text-xs font-semibold cursor-pointer"
                            title="Ver todos los mazos que piden esta carta"
                          >
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>
                              {item.numDecks} {item.numDecks === 1 ? "mazo" : "mazos"}
                            </span>
                            <Eye className="h-3 w-3 text-muted-foreground group-hover/btn:text-primary" />
                          </button>
                        </td>

                        {/* % Completitud Neto Total para todos los mazos */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-mono font-bold">
                              <TrendingUp className="h-3 w-3" />
                              <span>+{item.netCompletionGain || 0.1}%</span>
                            </div>
                            <span
                              className="text-[10px] text-muted-foreground mt-0.5 font-mono"
                              title="Suma total de puntos porcentuales entre todos los mazos solicitantes"
                            >
                              +{item.sumPointsGain || item.maxPotentialGain || 1.5}% sumado
                            </span>
                          </div>
                        </td>

                        {/* Tienes */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-foreground">
                          {item.copiesOwned}
                        </td>

                        {/* Necesitas */}
                        <td className="py-3 px-3 text-center font-mono font-semibold text-muted-foreground">
                          {item.copiesNeeded}
                        </td>

                        {/* Déficit */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              item.deficit > 0
                                ? "bg-rose-950/60 text-rose-300 border border-rose-800/60"
                                : "bg-emerald-950/60 text-emerald-300 border border-emerald-800/60"
                            }`}
                          >
                            {item.deficit > 0 ? `-${item.deficit}` : "0"}
                          </span>
                        </td>

                        {/* Precio (versión más barata) */}
                        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                          {formatPrice(item.price, data.currencySymbol)}
                        </td>

                        {/* Coste Déficit */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          {formatPrice(item.totalDeficitCost, data.currencySymbol)}
                        </td>

                        {/* Acciones: Want + Comprar + Mover */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ver Detalles */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setSelectedCardForDetail(item)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/80 shrink-0"
                              title={`Ver detalles de ${item.cardName}`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Want */}
                            <Button
                              size="sm"
                              variant={isAddedToWants ? "secondary" : "outline"}
                              onClick={() => handleAddToWants(item)}
                              disabled={loadingWantId === item.cardScryfallId}
                              className={`h-7 px-2 text-xs font-semibold gap-1 border-border transition-all ${
                                isAddedToWants
                                  ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                                  : "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                              }`}
                              title={isAddedToWants ? "¡En tu lista de Wants!" : "Añadir a lista de deseos (Wants)"}
                            >
                              {loadingWantId === item.cardScryfallId ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isAddedToWants ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>En Wants</span>
                                </>
                              ) : (
                                <>
                                  <Heart className="h-3 w-3" />
                                  <span>Want</span>
                                </>
                              )}
                            </Button>

                            {/* Reassign / Mover */}
                            {item.isReassignable && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReassignModalItem(item)}
                                className="h-7 px-2 text-xs font-semibold text-indigo-300 bg-indigo-950/40 border-indigo-700/60 hover:bg-indigo-900/60 hover:text-indigo-100 gap-1"
                                title="Reasignar carta de otro mazo"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                <span>Mover</span>
                              </Button>
                            )}

                            {/* Comprar */}
                            {item.deficit > 0 && (
                              <a
                                href={searchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-semibold bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/70 hover:text-emerald-100 transition-colors"
                                title="Comprar print más barato en Cardmarket"
                              >
                                <ShoppingCart className="h-3 w-3" />
                                <span>Comprar</span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ========================================================================= */
            /* GRID VIEW: Memory-optimized visual cards with net completion gain %       */
            /* ========================================================================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredItems.map((item) => {
                const searchUrl = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                  item.cardName
                )}`;
                const isAddedToWants = addedWants[item.cardScryfallId];

                return (
                  <div
                    key={item.cardScryfallId}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "380px" } as React.CSSProperties}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group"
                  >
                    {/* Top image & badges */}
                    <div
                      onClick={() => setSelectedCardForDetail(item)}
                      className="relative aspect-[5/7] w-full bg-background overflow-hidden cursor-pointer group/img"
                      title={`Ver detalles de ${item.cardName}`}
                    >
                      {item.imageUri ? (
                        <img
                          src={item.imageUri}
                          alt={item.cardName}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
                          Sin Imagen
                        </div>
                      )}

                      {/* Image hover overlay: ver detalles */}
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-xs text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 shadow-lg">
                          <Eye className="h-3.5 w-3.5" /> Ver detalles
                        </span>
                      </div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="bg-black/80 backdrop-blur-xs text-white border-white/20 font-mono text-[11px] font-bold"
                        >
                          {formatPrice(item.price, data.currencySymbol)}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full shadow-md ${
                            item.deficit > 0
                              ? "bg-rose-950/90 text-rose-300 border border-rose-800"
                              : "bg-emerald-950/90 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          Déficit: -{item.deficit}
                        </span>
                      </div>

                      {/* Bottom Image Overlay: Net Completion Gain for all decks */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-emerald-500/30 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Mejora Neta:
                        </span>
                        <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>+{item.netCompletionGain || 0.1}% total</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div
                          onClick={() => setSelectedCardForDetail(item)}
                          className="flex items-start justify-between gap-2 cursor-pointer"
                          title={`Ver detalles de ${item.cardName}`}
                        >
                          <CardPreviewHover cardName={item.cardName} imageUri={item.imageUri}>
                            <h4
                              onClick={() => setSelectedCardForDetail(item)}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer"
                            >
                              {item.cardName}
                            </h4>
                          </CardPreviewHover>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span className="truncate max-w-[130px]">{item.typeLine || "Card"}</span>
                          <ManaCost manaCost={item.manaCost} className="scale-75 origin-right" />
                        </div>
                      </div>

                      {/* Decks Pill Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedDecksModalItem(item)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-primary/15 border border-border hover:border-primary/40 text-xs text-foreground transition-all cursor-pointer font-medium"
                      >
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-primary" />
                          <span>{item.numDecks} {item.numDecks === 1 ? "mazo lo pide" : "mazos lo piden"}</span>
                        </div>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>

                      {/* Action buttons footer: Want + Comprar */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setSelectedCardForDetail(item)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground border-border hover:bg-secondary shrink-0"
                          title="Ver detalles de la carta"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant={isAddedToWants ? "secondary" : "outline"}
                          onClick={() => handleAddToWants(item)}
                          disabled={loadingWantId === item.cardScryfallId}
                          className={`flex-1 h-8 text-xs font-semibold gap-1.5 border-border ${
                            isAddedToWants
                              ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                              : "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                          }`}
                        >
                          {loadingWantId === item.cardScryfallId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isAddedToWants ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>En Wants</span>
                            </>
                          ) : (
                            <>
                              <Heart className="h-3.5 w-3.5" />
                              <span>Want</span>
                            </>
                          )}
                        </Button>

                        <a
                          href={searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md text-xs font-semibold bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/70 hover:text-emerald-100 transition-colors"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Comprar</span>
                        </a>

                        {item.isReassignable && (
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setReassignModalItem(item)}
                            className="h-8 w-8 text-indigo-300 bg-indigo-950/40 border-indigo-700/60 hover:bg-indigo-900/60 shrink-0"
                            title="Reasignar copia"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls (100 cards per page) */}
          <PaginationControls
            currentPage={page}
            totalPages={Math.max(1, Math.ceil((data.totalItems || data.totalUniqueCards || data.items.length) / 100))}
            totalCards={data.totalItems || data.totalUniqueCards || data.items.length}
            startIndex={(page - 1) * 100}
            endIndex={Math.min(page * 100, data.totalItems || data.totalUniqueCards || data.items.length)}
            onPageChange={handlePageChange}
            itemLabel="cartas prioritarias"
          />
          </div>
        ) : (
          <GoldenWantsTab
            onCardSelect={setSelectedCardForDetail}
            onDecksSelect={setSelectedDecksModalItem}
            items={initialData.items}
            currencySymbol={initialData.currencySymbol}
            priceWindowDays={initialData.priceWindowDays}
            globalDeckCount={initialData.globalDeckCount}
            globalCompletionBefore={initialData.globalCompletionBefore}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Decks Requesting this Card with Net Completion Gain %            */}
      {/* ========================================================================= */}
      {selectedDecksModalItem && (
        <Dialog
          open={Boolean(selectedDecksModalItem)}
          onOpenChange={(open) => !open && setSelectedDecksModalItem(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
            <DialogHeader className="border-b border-border/60 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-16 rounded-md overflow-hidden border border-border shrink-0 bg-background">
                    {selectedDecksModalItem.imageUri ? (
                      <img
                        src={selectedDecksModalItem.imageUri}
                        alt={selectedDecksModalItem.cardName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                        MTG
                      </div>
                    )}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <span>{selectedDecksModalItem.cardName}</span>
                      <ManaCost manaCost={selectedDecksModalItem.manaCost} className="scale-75 origin-left" />
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Pedida en {selectedDecksModalItem.numDecks}{" "}
                      {selectedDecksModalItem.numDecks === 1 ? "mazo" : "mazos"} · Déficit:{" "}
                      <span className="font-bold text-rose-400">-{selectedDecksModalItem.deficit}</span>
                    </DialogDescription>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className="bg-emerald-950/40 border-emerald-800/50 text-emerald-400 text-xs font-mono">
                        +{selectedDecksModalItem.netCompletionGain}% neto todos los mazos
                      </Badge>
                      <Badge variant="outline" className="bg-secondary text-muted-foreground text-xs font-mono">
                        +{selectedDecksModalItem.sumPointsGain}% suma de puntos
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Want button inside modal */}
                <Button
                  size="sm"
                  variant={addedWants[selectedDecksModalItem.cardScryfallId] ? "secondary" : "outline"}
                  onClick={() => handleAddToWants(selectedDecksModalItem)}
                  disabled={loadingWantId === selectedDecksModalItem.cardScryfallId}
                  className={`text-xs font-semibold gap-1.5 border-border ${
                    addedWants[selectedDecksModalItem.cardScryfallId]
                      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/50"
                      : "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                  }`}
                >
                  {addedWants[selectedDecksModalItem.cardScryfallId] ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>En Wants</span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-3.5 w-3.5" />
                      <span>Añadir a Wants</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogHeader>

            {/* Decks List */}
            <div className="overflow-y-auto flex-1 py-3 space-y-2.5 pr-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Desglose de mazos solicitantes y ganancia porcentual:
              </p>

              <div className="space-y-2">
                {selectedDecksModalItem.decks.map((deck) => {
                  const gain = deck.potentialGain || 1.5;
                  const newCompletion = Math.min(100, Math.round((deck.completionPercentage + gain) * 10) / 10);

                  return (
                    <div
                      key={deck.deckId}
                      className="p-3 rounded-xl border border-border bg-card/80 hover:bg-secondary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      {/* Deck identity and link */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {deck.colors.length > 0 && (
                          <ColorIdentityPips colors={deck.colors} size="xs" />
                        )}
                        <Link
                          href={`/decks/${deck.deckId}`}
                          className="font-bold text-foreground hover:text-primary transition-colors truncate max-w-[200px]"
                        >
                          {deck.deckName}
                        </Link>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>

                      {/* Completion Progress & Gain Badge */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">{deck.completionPercentage}%</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-bold text-foreground">{newCompletion}%</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {deck.requestedQuantity} {deck.requestedQuantity === 1 ? "copia pedida" : "copias pedidas"}
                          </span>
                        </div>

                        {/* Potential Gain Badge */}
                        <div className="px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 font-mono font-bold text-xs">
                          +{gain}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Card Reassignment Between Decks                                  */}
      {/* ========================================================================= */}
      {reassignModalItem && (
        <Dialog
          open={Boolean(reassignModalItem)}
          onOpenChange={(open) => !open && setReassignModalItem(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                <span>Reasignar {reassignModalItem.cardName}</span>
              </DialogTitle>
              <DialogDescription>
                Tienes copias asignadas a otros mazos. Puedes mover una copia a
                un mazo que la necesita para acelerar su finalización.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Opciones de reasignación:
              </p>
              <div className="space-y-2">
                {reassignModalItem.reassignOptions.map((opt, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">Origen: </span>
                        <span className="font-semibold text-foreground">
                          {opt.sourceDeckName}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                          ({opt.sourceDeckCompletion}%)
                        </span>
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div>
                        <span className="text-muted-foreground">Destino: </span>
                        <span className="font-semibold text-foreground">
                          {opt.targetDeckName}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground font-mono">
                          ({opt.targetDeckCompletion}%)
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleExecuteReassign(opt)}
                      disabled={isReassigning}
                      className="w-full h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
                    >
                      {isReassigning ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Reasignando...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Mover 1 copia a {opt.targetDeckName}</span>
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Card Detail Dialog */}
      {selectedCardForDetail && (
        <CardDetailDialog
          isOpen={Boolean(selectedCardForDetail)}
          onOpenChange={(open) => !open && setSelectedCardForDetail(null)}
          cardId={selectedCardForDetail.cardScryfallId}
          cardName={selectedCardForDetail.cardName}
          imageUri={selectedCardForDetail.imageUri}
          manaCost={selectedCardForDetail.manaCost}
          typeLine={selectedCardForDetail.typeLine}
          quantity={selectedCardForDetail.deficit}
          ownedInCollection={selectedCardForDetail.copiesOwned}
          missingCount={selectedCardForDetail.deficit}
          requestedInDecksCount={selectedCardForDetail.numDecks}
          requestedInDecks={selectedCardForDetail.decks.map((d) => ({
            deckId: d.deckId,
            deckName: d.deckName,
            quantity: d.requestedQuantity,
            completionPercentage: d.completionPercentage,
            colors: d.colors,
          }))}
        />
      )}
    </div>
  );
}
