"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Plus,
  TrendingUp,
  Coins,
  Layers,
  Trash2,
  Eye,
  Calendar,
  Sparkles,
  ArrowLeft,
  Search,
  ArrowUpDown,
  ImageIcon,
  List,
  LayoutGrid,
  ExternalLink,
} from "lucide-react";
import {
  getSimulatedCollections,
  getSimulatedCollection,
  deleteSimulatedCollection,
  type SimulatedCollectionSummary,
  type SimulatedCollectionAnalysisResponse,
  type SimulatedCardAnalysisItem,
  type CandidateDeckInfo,
} from "@/actions/simulated-collections";
import { isBasicLand } from "@/lib/card-utils";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SimulatedCollectionsTabProps {
  provider?: string;
}

type CardFilterType = "all" | "useful" | "sellable" | "new" | "owned";
type SortOption = "name-asc" | "name-desc" | "price-desc" | "price-asc" | "gain-desc" | "quantity-desc";
type ActiveViewTab = "cards" | "deck-growth";
type DeckViewFormat = "list" | "grid";

interface DeckGrowthItem {
  deckId: string;
  deckName: string;
  colors: string[];
  currentCompletion: number;
  gainPercentage: number;
  newCompletion: number;
  cardsToAddCount: number;
  cards: {
    cardName: string;
    quantity: number;
    imageUri?: string | null;
    manaCost?: string | null;
    typeLine?: string | null;
    potentialGain: number;
  }[];
}

export function SimulatedCollectionsTab({
  provider = "cardmarket",
}: SimulatedCollectionsTabProps) {
  const [collections, setCollections] = useState<SimulatedCollectionSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Selected collection ID for in-page view (replaces the modal once created/selected)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SimulatedCollectionAnalysisResponse | null>(null);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Detail dialog & candidate decks modal state
  const [cardForDetail, setCardForDetail] = useState<SimulatedCardAnalysisItem | null>(null);
  const [candidateDecksModal, setCandidateDecksModal] = useState<{
    cardName: string;
    decks: CandidateDeckInfo[];
  } | null>(null);

  // In-page view tab & format state
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>("cards");
  const [deckViewFormat, setDeckViewFormat] = useState<DeckViewFormat>("grid");

  // In-page search, filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [deckSearchQuery, setDeckSearchQuery] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("price-desc");

  // Fetch collections list
  const fetchCollections = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const data = await getSimulatedCollections(provider);
      setCollections(data);
    } catch (err) {
      console.error("Failed to load simulated collections", err);
    } finally {
      setIsLoadingList(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Fetch selected collection details when selectedCollectionId changes
  useEffect(() => {
    if (!selectedCollectionId) {
      setSelectedAnalysis(null);
      setSelectedError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingSelected(true);
    setSelectedError(null);

    getSimulatedCollection(selectedCollectionId, provider)
      .then((data) => {
        if (isMounted) {
          setSelectedAnalysis(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load simulated collection detail", err);
          setSelectedError("No se pudo cargar la colección simulada.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingSelected(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCollectionId, provider]);

  const handleOpenNew = () => {
    setIsDialogOpen(true);
  };

  const handleSelectCollection = (id: string) => {
    setSelectedCollectionId(id);
    setSearchQuery("");
    setDeckSearchQuery("");
    setCardFilter("all");
    setSortOption("price-desc");
    setActiveViewTab("cards");
  };

  const handleDeleteFromList = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar esta colección simulada?")) return;
    try {
      await deleteSimulatedCollection(id);
      if (selectedCollectionId === id) {
        setSelectedCollectionId(null);
      }
      fetchCollections();
    } catch (err) {
      console.error("Failed to delete simulated collection", err);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedCollectionId) return;
    if (!confirm("¿Seguro que deseas eliminar esta colección simulada?")) return;
    try {
      await deleteSimulatedCollection(selectedCollectionId);
      setSelectedCollectionId(null);
      fetchCollections();
    } catch (err) {
      console.error("Failed to delete simulated collection", err);
    }
  };

  // Filter and sort cards for the in-page view
  const processedCards = useMemo(() => {
    if (!selectedAnalysis) return [];

    let cards = [...selectedAnalysis.cards];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      cards = cards.filter((c) => c.cardName.toLowerCase().includes(q));
    }

    // Category filter
    if (cardFilter === "useful") {
      // User rule: Only cards that are NOT already in the collection, not basic lands, and are useful
      cards = cards.filter((c) => c.usefulCopies > 0 && c.copiesOwnedReal === 0 && !isBasicLand(c.typeLine, c.cardName));
    } else if (cardFilter === "sellable") {
      // Cards that can be sold
      cards = cards.filter((c) => c.sellableCopies > 0);
    } else if (cardFilter === "new") {
      cards = cards.filter((c) => c.copiesOwnedReal === 0);
    } else if (cardFilter === "owned") {
      cards = cards.filter((c) => c.copiesOwnedReal > 0);
    }

    // Sorting
    cards.sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.cardName.localeCompare(b.cardName);
        case "name-desc":
          return b.cardName.localeCompare(a.cardName);
        case "price-desc":
          return b.totalPrice - a.totalPrice;
        case "price-asc":
          return a.totalPrice - b.totalPrice;
        case "gain-desc":
          return b.netCompletionGain - a.netCompletionGain;
        case "quantity-desc":
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

    return cards;
  }, [selectedAnalysis, searchQuery, cardFilter, sortOption]);

  // Pagination state (limit to 200 cards per page)
  const ITEMS_PER_PAGE = 200;
  const [currentPage, setCurrentPage] = useState(1);
  const cardGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, cardFilter, sortOption, selectedCollectionId]);

  const totalPages = Math.max(1, Math.ceil(processedCards.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, processedCards.length);

  const paginatedCards = useMemo(() => {
    return processedCards.slice(startIndex, endIndex);
  }, [processedCards, startIndex, endIndex]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    cardGridRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  // Aggregate deck growth from candidate decks of all cards
  const deckGrowthList = useMemo(() => {
    if (!selectedAnalysis) return [];
    const deckMap = new Map<string, DeckGrowthItem>();

    for (const card of selectedAnalysis.cards) {
      if (!card.candidateDecks || card.candidateDecks.length === 0) continue;
      if (card.copiesOwnedReal > 0) continue;
      if (isBasicLand(card.typeLine, card.cardName)) continue;
      for (const cd of card.candidateDecks) {
        const addedQty = Math.min(card.quantity, cd.missingQuantity);
        if (addedQty <= 0 && cd.potentialGain <= 0) continue;

        const existing = deckMap.get(cd.deckId);
        if (existing) {
          existing.cardsToAddCount += addedQty;
          existing.gainPercentage += cd.potentialGain;
          existing.cards.push({
            cardName: card.cardName,
            quantity: addedQty,
            imageUri: card.imageUri,
            manaCost: card.manaCost,
            typeLine: card.typeLine,
            potentialGain: cd.potentialGain,
          });
        } else {
          deckMap.set(cd.deckId, {
            deckId: cd.deckId,
            deckName: cd.deckName,
            colors: cd.colors || [],
            currentCompletion: cd.completionPercentage,
            gainPercentage: cd.potentialGain,
            newCompletion: 0,
            cardsToAddCount: addedQty,
            cards: [
              {
                cardName: card.cardName,
                quantity: addedQty,
                imageUri: card.imageUri,
                manaCost: card.manaCost,
                typeLine: card.typeLine,
                potentialGain: cd.potentialGain,
              },
            ],
          });
        }
      }
    }

    const list = Array.from(deckMap.values()).map((item) => {
      const roundedGain = Math.round(item.gainPercentage * 10) / 10;
      return {
        ...item,
        gainPercentage: roundedGain,
        newCompletion: Math.min(100, Math.round((item.currentCompletion + roundedGain) * 10) / 10),
      };
    });

    // Filter by deck name search
    let filtered = list;
    if (deckSearchQuery.trim()) {
      const q = deckSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => d.deckName.toLowerCase().includes(q));
    }

    // Sort by gain percentage descending
    filtered.sort((a, b) => b.gainPercentage - a.gainPercentage);
    return filtered;
  }, [selectedAnalysis, deckSearchQuery]);

  // =========================================================================
  // VIEW 1: IN-PAGE SIMULATED COLLECTION VIEW
  // =========================================================================
  if (selectedCollectionId) {
    return (
      <div className="space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card/60">
          <div className="flex items-start sm:items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCollectionId(null)}
              className="gap-1.5 h-9 text-xs border-border shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Colecciones Simuladas</span>
            </Button>

            {selectedAnalysis && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedAnalysis.name}
                  </h3>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-mono">
                    Simulación
                  </Badge>
                </div>
                {selectedAnalysis.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {selectedAnalysis.description}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="gap-1.5 h-9 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Eliminar Simulación</span>
            </Button>
          </div>
        </div>

        {/* Loading state for selected collection */}
        {isLoadingSelected ? (
          <div className="flex flex-col items-center justify-center p-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Cargando datos de la colección simulada...</p>
          </div>
        ) : selectedError || !selectedAnalysis ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 space-y-3">
            <p className="text-sm text-destructive">{selectedError || "No se encontró la colección."}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCollectionId(null)}
              className="text-xs"
            >
              Volver al listado
            </Button>
          </div>
        ) : (
          <>
            {/* 4 Hero Metric Cards with Standardized Card Counts */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Valor Total Lote */}
              <div className="p-3.5 rounded-xl border border-border bg-card/60 relative overflow-hidden group">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium">Valor Total Lote</span>
                  <Coins className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
                  {selectedAnalysis.totalEconomicValue.toFixed(2)} {selectedAnalysis.currencySymbol}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedAnalysis.totalCards} cartas
                </p>
              </div>

              {/* Metric 2: Sin Ya Existentes */}
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium text-amber-300">Sin Ya Existentes</span>
                  <Coins className="h-4 w-4 text-amber-300" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 tracking-tight">
                  {selectedAnalysis.economicValueExcludingOwned.toFixed(2)} {selectedAnalysis.currencySymbol}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedAnalysis.totalCards - selectedAnalysis.alreadyOwnedCardsCount} cartas
                </p>
              </div>

              {/* Metric 3: NUEVA MÉTRICA AZUL - Valor vendible */}
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 relative overflow-hidden group">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium text-blue-400">Valor vendible</span>
                  <Coins className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400 tracking-tight">
                  {selectedAnalysis.sellableValue.toFixed(2)} {selectedAnalysis.currencySymbol}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedAnalysis.sellableCardsCount} cartas
                </p>
              </div>

              {/* Metric 4: Completitud */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-muted-foreground mb-1">
                  <span className="text-xs font-medium text-emerald-400">Completitud</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                  +{selectedAnalysis.globalNetGain.toFixed(2)}%
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {selectedAnalysis.usefulCardsCount} cartas
                </p>
              </div>
            </div>

            {/* View Switcher: Cartas vs Crecimiento de Mazos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-border pb-4">
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border w-fit">
                <Button
                  size="sm"
                  variant={activeViewTab === "cards" ? "secondary" : "ghost"}
                  onClick={() => setActiveViewTab("cards")}
                  className={`h-8 px-3 text-xs gap-1.5 rounded-lg ${
                    activeViewTab === "cards" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Cartas ({selectedAnalysis.cards.length})</span>
                </Button>

                <Button
                  size="sm"
                  variant={activeViewTab === "deck-growth" ? "secondary" : "ghost"}
                  onClick={() => setActiveViewTab("deck-growth")}
                  className={`h-8 px-3 text-xs gap-1.5 rounded-lg ${
                    activeViewTab === "deck-growth" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Crecimiento de Mazos ({deckGrowthList.length})</span>
                </Button>
              </div>

              {activeViewTab === "deck-growth" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium mr-1">Formato:</span>
                  <Button
                    size="sm"
                    variant={deckViewFormat === "grid" ? "secondary" : "ghost"}
                    onClick={() => setDeckViewFormat("grid")}
                    className="h-8 px-2.5 text-xs gap-1.5 border border-border"
                    title="Ver en formato cuadrícula"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Grid</span>
                  </Button>

                  <Button
                    size="sm"
                    variant={deckViewFormat === "list" ? "secondary" : "ghost"}
                    onClick={() => setDeckViewFormat("list")}
                    className="h-8 px-2.5 text-xs gap-1.5 border border-border"
                    title="Ver en formato lista"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Lista</span>
                  </Button>
                </div>
              )}
            </div>

            {/* TAB 1: CARTAS VIEW (3 COLUMNAS) */}
            {activeViewTab === "cards" && (
              <div className="space-y-4">
                {/* Search, Filter Pills & Sort Controls */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filtrar cartas de tu colección simulada por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 text-base"
                      />
                    </div>

                    {/* Sort selector */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="h-11 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="price-desc">Precio (Mayor a Menor)</option>
                        <option value="price-asc">Precio (Menor a Mayor)</option>
                        <option value="gain-desc">Mayor ganancia neta (%)</option>
                        <option value="name-asc">Nombre (A - Z)</option>
                        <option value="name-desc">Nombre (Z - A)</option>
                        <option value="quantity-desc">Cantidad</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Button
                      size="sm"
                      variant={cardFilter === "all" ? "secondary" : "outline"}
                      onClick={() => setCardFilter("all")}
                      className="h-8 text-xs px-3 rounded-full border-border"
                    >
                      Todas ({selectedAnalysis.cards.length})
                    </Button>

                    {/* Filter 'Aportan a mazos': Filters out cards already in real collection and basic lands */}
                    <Button
                      size="sm"
                      variant={cardFilter === "useful" ? "secondary" : "outline"}
                      onClick={() => setCardFilter("useful")}
                      className="h-8 text-xs px-3 rounded-full border-primary/30 text-primary hover:bg-primary/10"
                    >
                      Aportan a mazos ({selectedAnalysis.cards.filter((c) => c.usefulCopies > 0 && c.copiesOwnedReal === 0 && !isBasicLand(c.typeLine, c.cardName)).length})
                    </Button>

                    {/* Filter 'Valor vendible' */}
                    <Button
                      size="sm"
                      variant={cardFilter === "sellable" ? "secondary" : "outline"}
                      onClick={() => setCardFilter("sellable")}
                      className="h-8 text-xs px-3 rounded-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                    >
                      Valor vendible ({selectedAnalysis.cards.filter((c) => c.sellableCopies > 0).length})
                    </Button>

                    {/* Filter 'Nuevas en colección' */}
                    <Button
                      size="sm"
                      variant={cardFilter === "new" ? "secondary" : "outline"}
                      onClick={() => setCardFilter("new")}
                      className="h-8 text-xs px-3 rounded-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Nuevas ({selectedAnalysis.cards.filter((c) => c.copiesOwnedReal === 0).length})
                    </Button>

                    {/* Filter 'Ya en colección' */}
                    <Button
                      size="sm"
                      variant={cardFilter === "owned" ? "secondary" : "outline"}
                      onClick={() => setCardFilter("owned")}
                      className="h-8 text-xs px-3 rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    >
                      Ya en colección ({selectedAnalysis.cards.filter((c) => c.copiesOwnedReal > 0).length})
                    </Button>

                    {(searchQuery || cardFilter !== "all") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery("");
                          setCardFilter("all");
                        }}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Restablecer filtros
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3-COLUMN CARD GRID */}
                <div ref={cardGridRef} />
                {processedCards.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/30 space-y-2">
                    <p className="text-sm font-medium text-foreground">No se encontraron cartas</p>
                    <p className="text-xs text-muted-foreground">
                      Prueba a cambiar el filtro seleccionado o el texto de búsqueda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedCards.map((card) => {
                      const isAlreadyOwned = card.copiesOwnedReal > 0;
                      const isSellable = card.sellableCopies > 0;
                      const isBasic = isBasicLand(card.typeLine, card.cardName);
                      const hasDecks = card.candidateDecks && card.candidateDecks.length > 0 && !isAlreadyOwned && !isBasic;

                      return (
                        <div
                          key={card.cardName}
                          className="group relative rounded-xl border border-border bg-card hover:border-accent transition-all p-4 flex flex-col justify-between shadow-sm"
                        >
                          <div>
                            {/* PARTE SUPERIOR SOBRE LA CARTA: Nombre (izq) y Tipo + Maná (der) */}
                            <div className="flex items-center justify-between gap-2 mb-3 min-h-[28px]">
                              {/* Left: Card Name with Hover Preview */}
                              <div
                                className="flex-1 min-w-0"
                                onClick={() => setCardForDetail(card)}
                              >
                                <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri}>
                                  <h3
                                    className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate cursor-pointer"
                                    title={card.cardName}
                                  >
                                    {card.cardName}
                                  </h3>
                                </CardPreviewHover>
                              </div>

                              {/* Right: Card Type + Mana Cost */}
                              <div className="flex items-center gap-1.5 shrink-0 text-xs">
                                <span
                                  className="text-muted-foreground truncate max-w-[130px]"
                                  title={card.typeLine || "Card"}
                                >
                                  {card.typeLine || "Card"}
                                </span>
                                <ManaCost manaCost={card.manaCost} />
                              </div>
                            </div>

                            {/* 5/7 Card Image (CLEAN - no overlay badges as requested) */}
                            <div
                              onClick={() => setCardForDetail(card)}
                              className="relative aspect-[5/7] rounded-lg overflow-hidden bg-background border border-border mb-3.5 foil-card-effect cursor-pointer hover:border-primary/60 transition-colors"
                              title="Ver todos los datos en detalle"
                            >
                              {card.imageUri ? (
                                <Image
                                  src={card.imageUri}
                                  alt={card.cardName}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                  <ImageIcon className="h-8 w-8 mb-1" />
                                  <span className="text-xs">Sin imagen</span>
                                </div>
                              )}
                            </div>

                            {/* PIE DE LA CARTA: Todos los tags en el pie de la carta */}
                            <div className="space-y-2.5 pt-1">
                              {/* Status & Quantity Tags Row */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Quantity Badge */}
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono font-semibold px-2 py-0.5 border-border bg-secondary/60 text-foreground"
                                >
                                  x{card.quantity}
                                </Badge>

                                {/* Ownership Status Badge */}
                                {isAlreadyOwned ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono border-amber-500/40 text-amber-300 bg-amber-500/10"
                                  >
                                    En col: x{card.copiesOwnedReal}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                  >
                                    Nueva
                                  </Badge>
                                )}

                                {/* Sellable Status Badge */}
                                {isSellable && (
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono border-blue-500/40 text-blue-400 bg-blue-500/10"
                                  >
                                    Vendible: x{card.sellableCopies}
                                  </Badge>
                                )}

                                {/* Net Gain Badge */}
                                {card.netCompletionGain > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[11px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                  >
                                    +{card.netCompletionGain.toFixed(2)}% neto
                                  </Badge>
                                )}
                              </div>

                              {/* Candidate Decks Button */}
                              {hasDecks ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCandidateDecksModal({
                                      cardName: card.cardName,
                                      decks: card.candidateDecks,
                                    })
                                  }
                                  className="w-full inline-flex items-center justify-between gap-1 text-xs font-semibold text-indigo-300 bg-indigo-950/60 px-2.5 py-1.5 rounded-lg border border-indigo-800/60 hover:border-indigo-400 hover:text-indigo-100 transition-colors"
                                >
                                  <span className="inline-flex items-center gap-1.5 truncate">
                                    <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                    <span className="truncate">
                                      {card.candidateDeckCount === 1 ? "1 mazo que la pide" : `${card.candidateDeckCount} mazos que la piden`}
                                    </span>
                                  </span>
                                  {card.netCompletionGain > 0 && (
                                    <span className="font-mono text-[11px] text-emerald-400">
                                      +{card.netCompletionGain.toFixed(1)}%
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <div className="text-[11px] text-muted-foreground italic px-1">
                                  Sin mazos que la pidan
                                </div>
                              )}

                              {/* Pricing breakdown */}
                              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                                <span className="text-[10px] text-muted-foreground font-medium">Cotización:</span>
                                <div className="text-right">
                                  <span className="font-mono font-semibold text-amber-400">
                                    {card.totalPrice.toFixed(2)} {selectedAnalysis.currencySymbol}
                                  </span>
                                  {card.quantity > 1 && (
                                    <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                                      ({card.unitPrice.toFixed(2)}/ud)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Sellable Value breakdown (in Blue) */}
                              {isSellable && (
                                <div className="pt-1.5 border-t border-blue-500/20 flex items-center justify-between text-[11px] text-blue-400">
                                  <span className="font-medium">Valor vendible ({card.sellableCopies} ud):</span>
                                  <span className="font-mono font-semibold">
                                    {card.sellableValue.toFixed(2)} {selectedAnalysis.currencySymbol}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {processedCards.length > 0 && (
                  <PaginationControls
                    currentPage={safeCurrentPage}
                    totalPages={totalPages}
                    totalCards={processedCards.length}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={handlePageChange}
                    itemLabel="cartas de la simulación"
                  />
                )}
              </div>
            )}

            {/* TAB 2: CRECIMIENTO DE MAZOS (LISTA O GRID) */}
            {activeViewTab === "deck-growth" && (
              <div className="space-y-4">
                {/* Search Bar for Decks */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar mazos por nombre..."
                    value={deckSearchQuery}
                    onChange={(e) => setDeckSearchQuery(e.target.value)}
                    className="pl-9 h-11 text-sm"
                  />
                </div>

                {deckGrowthList.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/30 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Ningún mazo se beneficia de este lote
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Las cartas de esta colección simulada no corresponden a ranuras faltantes de tus mazos actuales.
                    </p>
                  </div>
                ) : deckViewFormat === "grid" ? (
                  /* DECK GROWTH GRID VIEW */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deckGrowthList.map((deck) => (
                      <div
                        key={deck.deckId}
                        className="p-4 rounded-xl border border-border bg-card flex flex-col justify-between space-y-4 shadow-sm hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-3">
                          {/* Deck Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {deck.colors && deck.colors.length > 0 ? (
                                  <ColorIdentityPips colors={deck.colors} size="xs" />
                                ) : (
                                  <span className="text-[10px] font-mono text-muted-foreground">C</span>
                                )}
                                <Link
                                  href={`/decks/${deck.deckId}`}
                                  className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                                  title={deck.deckName}
                                >
                                  {deck.deckName}
                                </Link>
                              </div>
                            </div>

                            <Link
                              href={`/decks/${deck.deckId}`}
                              className="text-muted-foreground hover:text-primary shrink-0"
                              title="Ver mazo"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>

                          {/* Visual Progress Bar with Gain */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Completitud:</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-muted-foreground">
                                  {deck.currentCompletion.toFixed(1)}%
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-emerald-400 font-bold">
                                  {deck.newCompletion.toFixed(1)}%
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 ml-1"
                                >
                                  +{deck.gainPercentage.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>

                            {/* Dual Progress Bar */}
                            <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden flex relative p-0.5 border border-border/80">
                              {/* Base Completion */}
                              <div
                                style={{ width: `${deck.currentCompletion}%` }}
                                className="h-full bg-slate-500 rounded-l-full"
                                title={`Completitud actual: ${deck.currentCompletion.toFixed(1)}%`}
                              />
                              {/* Gain Increase (Animated green) */}
                              <div
                                style={{
                                  width: `${Math.min(100 - deck.currentCompletion, deck.gainPercentage)}%`,
                                }}
                                className="h-full bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse"
                                title={`Aumento aportado: +${deck.gainPercentage.toFixed(1)}%`}
                              />
                            </div>
                          </div>

                          {/* Cards that would be added to this deck */}
                          <div className="pt-2 border-t border-border/60 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">Cartas a añadir:</span>
                              <Badge
                                variant="secondary"
                                className="font-mono text-xs font-semibold px-2 py-0.5"
                              >
                                +{deck.cardsToAddCount} {deck.cardsToAddCount === 1 ? "carta" : "cartas"}
                              </Badge>
                            </div>

                            {/* Card Chips */}
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5">
                              {deck.cards.map((c, i) => (
                                <span
                                  key={`${c.cardName}-${i}`}
                                  className="inline-flex items-center gap-1 text-[11px] bg-secondary/60 border border-border rounded-md px-2 py-0.5 text-foreground"
                                >
                                  <span className="font-semibold text-primary">{c.quantity}x</span>
                                  <span className="truncate max-w-[130px]">{c.cardName}</span>
                                  <span className="font-mono text-[10px] text-emerald-400 ml-0.5">
                                    +{c.potentialGain.toFixed(1)}%
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* DECK GROWTH LIST VIEW */
                  <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card/40">
                    {deckGrowthList.map((deck) => (
                      <div
                        key={deck.deckId}
                        className="p-4 hover:bg-secondary/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Left: Deck info */}
                        <div className="min-w-0 md:w-1/3 space-y-1">
                          <div className="flex items-center gap-2">
                            {deck.colors && deck.colors.length > 0 ? (
                              <ColorIdentityPips colors={deck.colors} size="xs" />
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground">C</span>
                            )}
                            <Link
                              href={`/decks/${deck.deckId}`}
                              className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
                            >
                              {deck.deckName}
                            </Link>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Añadiría:</span>
                            <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0 h-5">
                              +{deck.cardsToAddCount} {deck.cardsToAddCount === 1 ? "carta" : "cartas"}
                            </Badge>
                          </div>
                        </div>

                        {/* Center: Dual Progress Bar */}
                        <div className="md:w-1/3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground">
                              {deck.currentCompletion.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-emerald-400 font-bold">
                              {deck.newCompletion.toFixed(1)}%
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 ml-1"
                            >
                              +{deck.gainPercentage.toFixed(1)}%
                            </Badge>
                          </div>

                          <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden flex relative p-0.5 border border-border/80">
                            <div
                              style={{ width: `${deck.currentCompletion}%` }}
                              className="h-full bg-slate-500 rounded-l-full"
                            />
                            <div
                              style={{
                                width: `${Math.min(100 - deck.currentCompletion, deck.gainPercentage)}%`,
                              }}
                              className="h-full bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.7)] animate-pulse"
                            />
                          </div>
                        </div>

                        {/* Right: Added cards preview chips */}
                        <div className="md:w-1/3 flex flex-wrap gap-1 items-center justify-start md:justify-end">
                          {deck.cards.map((c, i) => (
                            <span
                              key={`${c.cardName}-${i}`}
                              className="inline-flex items-center gap-1 text-[10px] bg-secondary/60 border border-border rounded px-1.5 py-0.5 text-foreground"
                            >
                              <span className="font-semibold text-primary">{c.quantity}x</span>
                              <span className="truncate max-w-[100px]">{c.cardName}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Card Detail Dialog */}
        {cardForDetail && (
          <CardDetailDialog
            isOpen={Boolean(cardForDetail)}
            onOpenChange={(open) => !open && setCardForDetail(null)}
            cardId={cardForDetail.cardScryfallId || undefined}
            cardName={cardForDetail.cardName}
            imageUri={cardForDetail.imageUri}
            manaCost={cardForDetail.manaCost}
            typeLine={cardForDetail.typeLine}
            quantity={cardForDetail.quantity}
            ownedInCollection={cardForDetail.copiesOwnedReal}
          />
        )}

        {/* Candidate Decks Modal */}
        {candidateDecksModal && (
          <Dialog
            open={Boolean(candidateDecksModal)}
            onOpenChange={(open) => !open && setCandidateDecksModal(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{candidateDecksModal.cardName}</DialogTitle>
                <DialogDescription>
                  Mazos que necesitan esta carta de la simulación ({candidateDecksModal.decks.length})
                </DialogDescription>
              </DialogHeader>
              <ul className="max-h-80 overflow-y-auto space-y-1.5 pt-2">
                {candidateDecksModal.decks.map((deck) => (
                  <li key={deck.deckId}>
                    <Link
                      href={`/decks/${deck.deckId}`}
                      onClick={() => setCandidateDecksModal(null)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm hover:border-primary transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        {deck.colors && deck.colors.length > 0 ? (
                          <ColorIdentityPips colors={deck.colors} size="xs" />
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground" title="Incoloro">
                            C
                          </span>
                        )}
                        <span className="text-foreground font-medium truncate">{deck.deckName}</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs text-muted-foreground">
                          {deck.completionPercentage.toFixed(0)}%
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                        >
                          +{deck.potentialGain.toFixed(1)}% mazo
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LIST OF SAVED SIMULATED COLLECTIONS
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Colecciones Simuladas</h3>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-mono">
              Sandbox
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Sube lotes o paquetes temporales de cartas para simular cómo completarían tus mazos e inspeccionar su valor económico, sin alterar en absoluto tu colección real.
          </p>
        </div>

        <Button
          onClick={handleOpenNew}
          className="gap-2 h-10 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Colección Simulada</span>
        </Button>
      </div>

      {/* Content Area */}
      {isLoadingList ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Cargando colecciones simuladas...</p>
        </div>
      ) : collections.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/30 space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <FlaskConical className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-base font-medium text-foreground">No tienes colecciones simuladas</h4>
            <p className="text-xs text-muted-foreground">
              Puedes pegar un lote de cartas que estés pensando en comprar o cambiar para ver su impacto económico y cuánto mejoran tus mazos.
            </p>
          </div>
          <Button onClick={handleOpenNew} variant="outline" className="gap-2 text-xs border-border">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Crear primera simulación
          </Button>
        </div>
      ) : (
        /* Grid of Saved Collections */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((coll) => (
            <div
              key={coll.id}
              onClick={() => handleSelectCollection(coll.id)}
              className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {coll.name}
                    </h4>
                    {coll.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {coll.description}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDeleteFromList(e, coll.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Eliminar colección simulada"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 4 Metric Boxes with Standardized Card Counts */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Valor Total */}
                  <div className="p-2.5 rounded-lg border border-border/70 bg-secondary/40">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                      <Coins className="h-3 w-3 text-amber-400" />
                      <span>Valor Total</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                      {coll.totalEconomicValue.toFixed(2)} €
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {coll.totalCards} cartas
                    </div>
                  </div>

                  {/* Sin Ya Existentes */}
                  <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                      <Coins className="h-3 w-3 text-amber-300" />
                      <span>Sin Ya Existentes</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">
                      {coll.economicValueExcludingOwned.toFixed(2)} €
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {coll.totalCards - coll.alreadyOwnedCardsCount} cartas
                    </div>
                  </div>

                  {/* NUEVA MÉTRICA AZUL: Valor vendible */}
                  <div className="p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                      <Coins className="h-3 w-3 text-blue-400" />
                      <span className="text-blue-400 font-medium">Valor vendible</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-blue-400 mt-0.5">
                      {coll.sellableValue.toFixed(2)} €
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {coll.sellableCardsCount} cartas
                    </div>
                  </div>

                  {/* Completitud */}
                  <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      <span>Completitud</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      +{coll.globalNetGain.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {coll.usefulCardsCount} cartas
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(coll.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-primary group-hover:underline font-medium">
                  <Eye className="h-3 w-3" />
                  <span>Ver simulación</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal Dialog (Only used when clicking "Nueva Colección Simulada") */}
      <SimulatedCollectionDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSaved={(newId) => {
          fetchCollections();
          if (newId) {
            handleSelectCollection(newId);
          }
        }}
        provider={provider}
      />
    </div>
  );
}
