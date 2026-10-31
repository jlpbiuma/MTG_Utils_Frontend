"use client";

import { UpcomingReprintWarning } from "@/components/upcoming-reprint-warning";

import { SimulatedHistorySummary } from "@/components/simulated-history-summary";

import { ViewToolbar, ToolbarSearch, ToolbarChoices, ToolbarSort } from "@/components/view-toolbar";

import { type WhatsAppMatchesResponse } from "@/actions/whatsapp-matches";
import { importOfferLink, applySimulatedPrinting } from "@/actions/simulated-collections";
import { OfferCollectionDialog } from "@/components/offer-collection-dialog";
import { OfferControls } from "@/components/offer-controls";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { FlaskConical, Plus, TrendingUp, Coins, Layers, Trash2, Eye, Calendar, Sparkles, ArrowLeft, ImageIcon, List, LayoutGrid, ExternalLink } from "lucide-react";
import { deleteSimulatedCollection, addCardToSimulatedCollection, removeCardFromSimulatedCollection, type SimulatedCollectionSummary, type SimulatedCollectionAnalysisResponse, type SimulatedCardAnalysisItem, type CandidateDeckInfo } from "@/actions/simulated-collections";
import type { CardPrintingDetail } from "@/actions/scryfall";
import { normalizeCardName, isBasicLand } from "@/lib/card-utils";
import { SimulatedPurchaseComparison } from "@/components/simulated-purchase-comparison";
import { SimulatedCollectionDialog } from "@/components/simulated-collection-dialog";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { CardSearchDialog } from "@/components/card-search-dialog";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { simulationListCards, matchesSimulationFilter, sortSimulationCards, type SimulationFilter, type SimulationSort } from "@/lib/simulated-card-list";
import { SimulatedCardTable, SimulationMembershipTags, SimulationPriceDetails } from "@/components/simulated-card-table";
import { runBulkAction } from "@/lib/bulk-actions";
import { getDiscoveredOffers, getSimulatedCollection, getSimulatedCollections, getWhatsAppMatches } from "@/lib/reads";


type CardFilterType = SimulationFilter;
type SortOption = SimulationSort;
type ActiveViewTab = "cards" | "deck-growth";
type DeckViewFormat = "list" | "grid";

interface DeckGrowthItem {
  deckId: string;
  deckName: string;
  colors: string[];
  currentCompletion: number;
  totalCards?: number | null;
  ownedCards?: number | null;
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

export function SimulatedCollectionsTab() {
  const provider = "cardmarket";
  const [collections, setCollections] = useState<SimulatedCollectionSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [discoveredOffers, setDiscoveredOffers] = useState<SimulatedCollectionSummary[]>([]);
  const [discovered, setDiscovered] = useState<WhatsAppMatchesResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(true);
  const listRequest = useRef(0);
  const [importing, setImporting] = useState(false);
  const [originFilter, setOriginFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const allOffers = useMemo<SimulatedCollectionSummary[]>(() => [
    ...collections,
    ...discoveredOffers.filter(discovery => !collections.some(offer => offer.sourceUrl === discovery.sourceUrl && (offer.opportunitySubject ?? "vende") === discovery.opportunitySubject)),
  ], [collections, discoveredOffers]);
  const [offerQuery,setOfferQuery] = useState("");
  const [offerStatus,setOfferStatus] = useState("all");
  const [offerSort,setOfferSort] = useState<"date" | "name" | "value" | "gain">("date");
  const [offerDirection,setOfferDirection] = useState<"asc" | "desc">("desc");
  const [offerView,setOfferView] = useState<"grid" | "list">("grid");
  const visibleOffers = useMemo(() => allOffers.filter(offer => (originFilter === "all" || (offer.origin ?? "other") === originFilter) && (subjectFilter === "all" || (offer.opportunitySubject ?? "vende") === subjectFilter) && (offerStatus === "all" || (offer.status ?? "evaluating") === offerStatus) && `${offer.name} ${offer.seller ?? ""} ${offer.description ?? ""}`.toLowerCase().includes(offerQuery.trim().toLowerCase())).sort((first,second) => {
    const comparison = offerSort === "name" ? first.name.localeCompare(second.name) : offerSort === "value" ? first.totalEconomicValue-second.totalEconomicValue : offerSort === "gain" ? first.globalNetGain-second.globalNetGain : (Date.parse(first.createdAt) || 0)-(Date.parse(second.createdAt) || 0);
    return (offerDirection === "asc" ? comparison : -comparison) || first.name.localeCompare(second.name);
  }),[allOffers,originFilter,subjectFilter,offerQuery,offerStatus,offerSort,offerDirection]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Selected collection ID for in-page view (replaces the modal once created/selected)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SimulatedCollectionAnalysisResponse | null>(null);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [cardMutationError, setCardMutationError] = useState<string | null>(null);
  const [removingCardName, setRemovingCardName] = useState<string | null>(null);
  const [selectedSimulationNames, setSelectedSimulationNames] = useState<string[]>([]);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [acquisitionOffer, setAcquisitionOffer] = useState<SimulatedCollectionAnalysisResponse | null>(null);
  const [acquisitionNames, setAcquisitionNames] = useState<string[] | undefined>();
  const [preparingOfferId, setPreparingOfferId] = useState<string | null>(null);
  const [acquisitionError, setAcquisitionError] = useState<string | null>(null);
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);

  // Detail dialog & candidate decks modal state
  const [cardForDetail, setCardForDetail] = useState<SimulatedCardAnalysisItem | null>(null);
  const [candidateDecksModal, setCandidateDecksModal] = useState<{
    cardName: string;
    decks: CandidateDeckInfo[];
  } | null>(null);

  // In-page view tab & format state
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>("cards");
  const [growthSort, setGrowthSort] = useState<"name" | "gain" | "completion">("gain");
  const [growthDirection, setGrowthDirection] = useState<"asc" | "desc">("desc");
  const [deckViewFormat, setDeckViewFormat] = useState<DeckViewFormat>("grid");

  // In-page search, filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [deckSearchQuery, setDeckSearchQuery] = useState("");
  const [cardView, setCardView] = useState<"grid" | "list">("grid");
  const [cardFilter, setCardFilter] = useState<CardFilterType>("all");
  const [sortOption, setSortOption] = useState<SortOption>("price-desc");

  // Fetch collections list
  const fetchCollections = useCallback(async () => {
    const request = ++listRequest.current;
    const current = () => request === listRequest.current;
    setIsLoadingList(true);
    setIsLoadingDiscovery(true);
    setListError(null);
    setDiscoveryError(null);
    // Saved offers must become usable without waiting for source discovery.
    const saved = getSimulatedCollections(provider)
      .then(data => { if (current()) setCollections(data); })
      .catch(() => { if (current()) setListError("No se pudieron cargar las ofertas guardadas. Inténtalo de nuevo."); })
      .finally(() => { if (current()) setIsLoadingList(false); });
    const discovery = Promise.all([getWhatsAppMatches(), getDiscoveredOffers()])
      .then(([opportunities, candidates]) => {
        if (current()) {
          setDiscovered(opportunities);
          setDiscoveredOffers(candidates);
        }
      })
      .catch(() => { if (current()) setDiscoveryError("No se pudieron cargar las ofertas adicionales. Puedes consultar las ofertas guardadas."); })
      .finally(() => { if (current()) setIsLoadingDiscovery(false); });
    await Promise.all([saved, discovery]);
  }, [provider]);

  useEffect(() => {
    void fetchCollections();
    return () => { listRequest.current += 1; };
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

  const handleSimulationVersion = async (version: CardPrintingDetail) => {
    if (!selectedCollectionId || !cardForDetail) return;
    const result = await applySimulatedPrinting({ collectionId: selectedCollectionId, rawText: selectedAnalysis?.rawText ?? "", cardName: cardForDetail.cardName, printingId: version.id, provider });
    if (!result.ok) throw new Error(result.error);
    const updated = result.data;
    setSelectedAnalysis(updated);
    setCardForDetail(current => current?.cardName === cardForDetail.cardName ? updated.cards.find(card => card.cardName === current.cardName) || null : current);
    setCollections(current => current.map(offer => offer.id === updated.id ? { ...offer, ...updated, id: offer.id } : offer));
  };

  const handleAddSimulationCard = async (card: { cardName: string; quantity: number }) => {
    if (!selectedCollectionId) return;
    setCardMutationError(null);
    try {
      const updated = await addCardToSimulatedCollection(selectedCollectionId, card.cardName, card.quantity, provider);
      setSelectedAnalysis(updated);
      void fetchCollections();
    } catch (error) {
      setCardMutationError(error instanceof Error ? error.message : "No se pudo importar la carta.");
      throw error;
    }
  };

  const handleRemoveSimulationCard = async (card: SimulatedCardAnalysisItem) => {
    if (!selectedCollectionId || removingCardName) return;
    if (!confirm(`¿Eliminar ${card.cardName} y todas sus copias de esta colección simulada?`)) return;
    setRemovingCardName(card.cardName);
    setCardMutationError(null);
    try {
      const updated = await removeCardFromSimulatedCollection(selectedCollectionId, card.cardName, provider);
      setSelectedAnalysis(updated);
      setCardForDetail(current => current?.cardName === card.cardName ? null : current);
      void fetchCollections();
    } catch (error) {
      setCardMutationError(error instanceof Error ? error.message : "No se pudo eliminar la carta.");
    } finally {
      setRemovingCardName(null);
    }
  };

  const handleBulkSimulation = async () => {
    if (!selectedAnalysis || !selectedCollectionId) return;
    const chosen = listCards.filter(card => selectedSimulationNames.includes(card.cardName));
    if (!chosen.length || !confirm(`¿Eliminar ${chosen.length} cartas de esta simulación?`)) return;
    setIsBulkBusy(true);
    setCardMutationError(null);
    const chosenNames = new Set(chosen.map(card => card.cardName));
    setSelectedAnalysis(current => current ? { ...current, cards: current.cards.filter(card => !chosenNames.has(card.cardName)) } : current);
    try {
      const failures = await runBulkAction(chosen, card => removeCardFromSimulatedCollection(selectedCollectionId, card.cardName, provider));
      setSelectedSimulationNames([]);
      setSelectedAnalysis(await getSimulatedCollection(selectedCollectionId, provider));
      setBulkActionMessage(failures.length ? `${chosen.length - failures.length} completadas; ${failures.length} no se pudieron procesar.` : `${chosen.length} cartas eliminadas.`);
      await fetchCollections();
    } catch (error) {
      setCardMutationError(error instanceof Error ? error.message : "No se pudo completar la acción.");
      setSelectedAnalysis(await getSimulatedCollection(selectedCollectionId, provider));
    } finally { setIsBulkBusy(false); }
  };

  const prepareAcquisition = async (offer: SimulatedCollectionSummary) => {
    if (preparingOfferId) return;
    setPreparingOfferId(offer.id);
    setAcquisitionError(null);
    try {
      const analysis = offer.id.startsWith("discovery:")
        ? await importOfferLink({ url: offer.sourceUrl!, name: offer.name, origin: offer.origin ?? "other", subject: "vende", savedOnly: true })
        : await getSimulatedCollection(offer.id, provider);
      if (!analysis) throw new Error("No se encontró la oferta.");
      setAcquisitionNames(undefined);
      setAcquisitionOffer(analysis);
    } catch (error) {
      setAcquisitionError(error instanceof Error ? error.message : "No se pudo cargar la oferta.");
    } finally { setPreparingOfferId(null); }
  };

  const handleOpenNew = () => {
    setIsDialogOpen(true);
  };

  const handleSelectCollection = async (id: string) => {
    if (id.startsWith("discovery:")) {
      if (importing) return;
      const offer = allOffers.find(item => item.id === id);
      if (!offer?.sourceUrl) return;
      setImporting(true);
      setListError(null);
      try {
        const saved = await importOfferLink({ url: offer.sourceUrl, name: offer.name, origin: offer.origin ?? "other", subject: offer.opportunitySubject ?? "vende", savedOnly: true });
        if (!saved.id) throw new Error("No se pudo guardar la oferta.");
        await fetchCollections();
        setSelectedCollectionId(saved.id);
      } catch (error) {
        setListError(error instanceof Error ? error.message : "No se pudo abrir la oferta.");
      } finally { setImporting(false); }
      return;
    }
    setSelectedCollectionId(id);
    setSearchQuery("");
    setDeckSearchQuery("");
    setCardFilter("all");
    setSortOption("price-desc");
    setActiveViewTab("cards");
    setCardMutationError(null);
    setSelectedSimulationNames([]);
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

  const listCards = useMemo(() => selectedAnalysis ? simulationListCards(selectedAnalysis) : [], [selectedAnalysis]);
  const processedCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortSimulationCards(listCards.filter(card =>
      (!query || card.cardName.toLowerCase().includes(query)) && matchesSimulationFilter(card, cardFilter)
    ), sortOption);
  }, [listCards, searchQuery, cardFilter, sortOption]);

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
        const addedQty = cd.missingQuantity > 0 && card.quantity > 0 ? 1 : 0;
        if (addedQty <= 0 && cd.potentialGain <= 0) continue;

        const existing = deckMap.get(cd.deckId);
        if (existing) {
          existing.cardsToAddCount += 1;
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
            totalCards: cd.totalCards,
            ownedCards: cd.ownedCards,
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
      const newCompletion = item.totalCards && item.ownedCards != null
        ? Math.min(100, Math.round((item.ownedCards + item.cardsToAddCount) / item.totalCards * 1000) / 10)
        : Math.min(100, Math.round((item.currentCompletion + item.gainPercentage) * 10) / 10);
      const roundedGain = Math.round((newCompletion - item.currentCompletion) * 10) / 10;
      return {
        ...item,
        gainPercentage: roundedGain,
        newCompletion,
      };
    });

    // Filter by deck name search
    let filtered = list;
    if (deckSearchQuery.trim()) {
      const q = deckSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => d.deckName.toLowerCase().includes(q));
    }

    // Sort by gain percentage descending
    filtered.sort((a, b) => {
      const comparison = growthSort === "name" ? a.deckName.localeCompare(b.deckName) : growthSort === "completion" ? a.newCompletion - b.newCompletion : a.gainPercentage - b.gainPercentage;
      return comparison * (growthDirection === "asc" ? 1 : -1);
    });
    return filtered;
  }, [selectedAnalysis, deckSearchQuery, growthSort, growthDirection]);

  // =========================================================================
  // VIEW 1: IN-PAGE SIMULATED COLLECTION VIEW
  // =========================================================================
  const acquisitionCards = acquisitionOffer?.cards.filter(card => !acquisitionNames || acquisitionNames.includes(card.cardName)) ?? [];
  const selectionCoversAll = acquisitionOffer && acquisitionCards.length === acquisitionOffer.cards.length;
  const acquisitionCost = acquisitionOffer?.origin === "in_person"
    ? Math.round(acquisitionCards.reduce((sum, card) => sum + card.totalPrice, 0) * 100) / 100
    : acquisitionNames
    ? (acquisitionOffer?.purchaseAnalysis?.cards.filter(card => acquisitionNames.some(name => normalizeCardName(name) === normalizeCardName(card.cardName))).reduce((sum, card) => sum + (card.purchaseTotal ?? 0), 0) ?? 0)
    : acquisitionOffer?.paidTotal ?? acquisitionOffer?.purchaseAnalysis?.totalPurchaseCost ?? 0;
  const collectionDialog = acquisitionOffer && <OfferCollectionDialog
    key={`${acquisitionOffer.id}:${acquisitionNames?.join("|") ?? "all"}`}
    finance={{offerId:acquisitionOffer.id!,valuationRevision:acquisitionOffer.valuationRevision,origin:acquisitionOffer.origin ?? "other",cardNames:acquisitionNames ?? undefined}}
    name={acquisitionOffer.name} cards={acquisitionCards} initialCost={acquisitionCost} fixedCost={acquisitionOffer.origin === "in_person"}
    shipping={acquisitionOffer.origin !== "in_person" && selectionCoversAll ? acquisitionOffer.shipping ?? 0 : 0} selection={!!acquisitionNames}
    onClose={() => setAcquisitionOffer(null)}
    onConfirm={async () => {
      if (!acquisitionOffer.id) throw new Error("No se encontró la oferta.");
      setSelectedSimulationNames([]);
      setBulkActionMessage(`${acquisitionCards.length} cartas añadidas a tu colección.`);
      if (selectedCollectionId === acquisitionOffer.id) {
        try { setSelectedAnalysis(await getSimulatedCollection(acquisitionOffer.id, provider)); }
        catch {
          setSelectedAnalysis(null);
          setSelectedError("Las cartas se han añadido. Vuelve a abrir la oferta para actualizar el detalle.");
        }
      }
      await fetchCollections();
    }}
  />;

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
              <span>Volver a Evaluar oferta</span>
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
            {selectedAnalysis.origin === "cardmarket" && selectedAnalysis.id && selectedAnalysis.opportunitySubject !== "compra_busca" && <OfferControls key={selectedAnalysis.id} offer={selectedAnalysis} onUpdated={async () => { const fresh = await getSimulatedCollection(selectedAnalysis.id!, provider); setSelectedAnalysis(fresh); await fetchCollections(); }} />}
            {selectedAnalysis.origin === "cardmarket" && selectedAnalysis.purchaseAnalysis && <SimulatedPurchaseComparison analysis={selectedAnalysis.purchaseAnalysis} onCardDetails={name => setCardForDetail(selectedAnalysis.cards.find(card => normalizeCardName(card.cardName) === normalizeCardName(name)) || null)} />}
            <p className="text-sm text-muted-foreground">Origen: {selectedAnalysis.origin === "whatsapp" ? "WhatsApp" : selectedAnalysis.origin === "cardmarket" ? "Cardmarket" : selectedAnalysis.origin === "in_person" ? "Venta presencial" : "Otros"} · Completitud global del lote: {(selectedAnalysis.globalCompletionBefore ?? 0).toFixed(2)}% → {(selectedAnalysis.globalCompletionAfter ?? 0).toFixed(2)}%</p>
            {selectedAnalysis.origin === "cardmarket" && <SimulatedHistorySummary analysis={selectedAnalysis} />}
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

            </div>

            {/* TAB 1: CARTAS VIEW (3 COLUMNAS) */}
            {activeViewTab === "cards" && (
              <div className="space-y-4">
                <ViewToolbar
                  label="Opciones de las cartas de la oferta"
                  search={
                    <ToolbarSearch
                      label="Buscar cartas simuladas"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Filtrar cartas de tu colección simulada por nombre..."
                    />
                  }
                  filters={
                    <ToolbarChoices
                      label="Filtrar cartas"
                      value={cardFilter}
                      onChange={setCardFilter}
                      options={[
                        { value: "all", label: `Todas (${selectedAnalysis.cards.length})` },
                        {
                          value: "wants",
                          label: `Wants (${listCards.filter((card) => matchesSimulationFilter(card, "wants")).length})`,
                        },
                        {
                          value: "decks",
                          label: `En mazos (${listCards.filter((card) => matchesSimulationFilter(card, "decks")).length})`,
                        },
                        {
                          value: "unrelated",
                          label: `Fuera de todo (${listCards.filter((card) => matchesSimulationFilter(card, "unrelated")).length})`,
                        },
                        {
                          value: "useful",
                          label: `Aportan a mazos (${selectedAnalysis.cards.filter((card) => card.usefulCopies > 0 && card.copiesOwnedReal === 0 && !isBasicLand(card.typeLine, card.cardName)).length})`,
                        },
                        {
                          value: "sellable",
                          label: `Valor vendible (${selectedAnalysis.cards.filter((card) => card.sellableCopies > 0).length})`,
                        },
                        {
                          value: "new",
                          label: `Nuevas (${selectedAnalysis.cards.filter((card) => card.copiesOwnedReal === 0).length})`,
                        },
                        {
                          value: "owned",
                          label: `Ya en colección (${selectedAnalysis.cards.filter((card) => card.copiesOwnedReal > 0).length})`,
                        },
                      ]}
                    />
                  }
                  sorting={
                    <ToolbarSort
                      value={sortOption.split("-")[0]}
                      direction={sortOption.endsWith("asc") ? "asc" : "desc"}
                      onChange={(value, dir) => setSortOption(`${value}-${dir}` as SortOption)}
                      options={[
                        { value: "price", label: "Mercado total", defaultDesc: true },
                        { value: "unit", label: "Precio unitario", defaultDesc: true },
                        { value: "purchase", label: "Precio compra total", defaultDesc: true },
                        { value: "difference", label: "Precio diferencial", defaultDesc: true },
                        { value: "gain", label: "Ganancia neta (%)", defaultDesc: true },
                        { value: "name", label: "Nombre" },
                        { value: "quantity", label: "Cantidad", defaultDesc: true },
                      ]}
                    />
                  }
                  display={
                    <ToolbarChoices
                      label="Vista de cartas"
                      value={cardView}
                      onChange={setCardView}
                      options={[
                        { value: "grid", label: "Cuadrícula", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                        { value: "list", label: "Listado", icon: <List className="h-3.5 w-3.5" /> },
                      ]}
                    />
                  }
                  actions={
                    <>
                      <CardSearchDialog
                        title="Importar una carta a la colección simulada"
                        triggerText="Importar carta"
                        onAddCard={({ cardName, quantity }) =>
                          handleAddSimulationCard({ cardName, quantity })
                        }
                      />
                      {(searchQuery || cardFilter !== "all") && (
                        <Button
                          variant="ghost"
                          className="min-h-11 text-xs"
                          onClick={() => {
                            setSearchQuery("");
                            setCardFilter("all");
                          }}
                        >
                          Restablecer filtros
                        </Button>
                      )}
                    </>
                  }
                />
                <p className="text-xs text-muted-foreground">Unitario = mercado por copia · Compra y diferencial = total de las copias. Diferencial positivo = ahorro. Sin datos al final; varias versiones usan la media por copia.</p>
                {cardMutationError && <p role="alert" className="text-sm text-destructive">{cardMutationError}</p>}
                {bulkActionMessage && <p role="status" className="text-sm text-muted-foreground">{bulkActionMessage}</p>}

                {/* 3-COLUMN CARD GRID */}
                <div ref={cardGridRef} />
                {processedCards.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/30 space-y-2">
                    <p className="text-sm font-medium text-foreground">No se encontraron cartas</p>
                    <p className="text-xs text-muted-foreground">
                      Prueba a cambiar el filtro seleccionado o el texto de búsqueda.
                    </p>
                  </div>
                ) : cardView === "list" ? (
                  <SimulatedCardTable cards={paginatedCards} symbol={selectedAnalysis.currencySymbol} onDetails={setCardForDetail} onDecks={card => setCandidateDecksModal({ cardName: card.cardName, decks: card.candidateDecks })} onRemove={handleRemoveSimulationCard} removingCardName={removingCardName} selectedNames={selectedSimulationNames} onToggleSelect={(card, checked) => setSelectedSimulationNames(names => checked ? [...names, card.cardName] : names.filter(name => name !== card.cardName))} />
                ) : (
                  <div aria-label="Cuadrícula de cartas simuladas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                              <input type="checkbox" checked={selectedSimulationNames.includes(card.cardName)} onChange={(event) => setSelectedSimulationNames(names => event.target.checked ? [...names, card.cardName] : names.filter(name => name !== card.cardName))} aria-label={`Seleccionar ${card.cardName}`} title={`Seleccionar ${card.cardName}`} className="h-5 w-5 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
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
                                <UpcomingReprintWarning reprints={card.upcomingReprints} />
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
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Eliminar ${card.cardName} de la colección simulada`}
                                  title={`Eliminar ${card.cardName}`}
                                  disabled={Boolean(removingCardName)}
                                  onClick={(event) => { event.stopPropagation(); void handleRemoveSimulationCard(card); }}
                                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                ><Trash2 className="h-4 w-4" /></Button>
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
                                <SimulationMembershipTags card={card} />
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

                              <SimulationPriceDetails card={card} symbol={selectedAnalysis.currencySymbol} />

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
                <ViewToolbar
                  label="Opciones del crecimiento de mazos"
                  search={
                    <ToolbarSearch
                      value={deckSearchQuery}
                      onChange={setDeckSearchQuery}
                      placeholder="Filtrar mazos por nombre..."
                    />
                  }
                  sorting={
                    <ToolbarSort
                      value={growthSort}
                      direction={growthDirection}
                      onChange={(value, direction) => {
                        setGrowthSort(value);
                        setGrowthDirection(direction);
                      }}
                      options={[
                        { value: "name", label: "Nombre" },
                        { value: "gain", label: "Mejora", defaultDesc: true },
                        { value: "completion", label: "Completitud", defaultDesc: true },
                      ]}
                    />
                  }
                  display={
                    <ToolbarChoices
                      label="Vista"
                      value={deckViewFormat}
                      onChange={setDeckViewFormat}
                      options={[
                        { value: "grid", label: "Cuadrícula" },
                        { value: "list", label: "Lista" },
                      ]}
                    />
                  }
                />

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

        <div aria-live="polite" className={`fixed bottom-20 md:bottom-5 left-1/2 z-50 flex w-[min(94vw,34rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur transition-all duration-200 motion-reduce:transition-none ${activeViewTab === "cards" && selectedSimulationNames.length ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`} aria-hidden={activeViewTab !== "cards" || !selectedSimulationNames.length}>
          <span className="text-sm font-medium tabular-nums">{selectedSimulationNames.length} seleccionadas</span>
          <div className="flex items-center gap-2"><Button size="sm" disabled={isBulkBusy || !selectedSimulationNames.length || (selectedAnalysis?.status === "purchased" || selectedAnalysis?.status === "discarded") || selectedAnalysis?.opportunitySubject === "compra_busca"} onClick={() => { setAcquisitionNames([...selectedSimulationNames]); setAcquisitionOffer(selectedAnalysis); }}>Añadir selección a colección</Button><Button size="sm" variant="destructive" disabled={isBulkBusy || !selectedSimulationNames.length || selectedAnalysis?.status === "purchased"} onClick={() => handleBulkSimulation()}>Eliminar</Button></div>
        </div>

        {/* Card Detail Dialog */}
        {collectionDialog}
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
            simulationVersionSelection
            onVersionSelect={handleSimulationVersion}
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
            <h3 className="text-lg font-semibold text-foreground">Evaluar oferta</h3>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-mono">
              Ofertas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Importa un enlace, una lista o un carrito, descubre ofertas de WhatsApp y compara su coste e impacto antes de comprar.
          </p>
        </div>

        <Button
          onClick={handleOpenNew}
          className="gap-2 h-10 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Evaluar nueva oferta</span>
        </Button>
      </div>

      {discovered && <div className="grid gap-3 sm:grid-cols-3" aria-label="Resumen de oportunidades">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Cartas analizadas en las fuentes</p><p className="mt-1 text-xl font-bold font-mono">{discovered.total_cards_scanned}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Coincidencias para comprar / vender</p><p className="mt-1 text-xl font-bold font-mono">{discovered.total_wants_matches} / {discovered.total_collection_matches}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Completitud global actual</p><p className="mt-1 text-xl font-bold font-mono">{(discovered.global_completion_before ?? 0).toFixed(2)}%</p>{discovered.last_scraped_at && <p className="text-xs text-muted-foreground">Actualizado: {new Date(discovered.last_scraped_at).toLocaleString("es-ES")}</p>}</div>
      </div>}
      <ViewToolbar
        label="Opciones del listado de ofertas"
        search={
          <ToolbarSearch
            value={offerQuery}
            onChange={setOfferQuery}
            placeholder="Buscar oferta por nombre o vendedor..."
          />
        }
        filters={
          <>
          <ToolbarChoices label="Origen" value={originFilter} onChange={setOriginFilter} options={[{ value: "all", label: "Todos" }, { value: "whatsapp", label: "WhatsApp" }, { value: "cardmarket", label: "Cardmarket" }, { value: "in_person", label: "Venta presencial" }, { value: "other", label: "Otros" }]} />
          <ToolbarChoices label="Operación" value={subjectFilter} onChange={setSubjectFilter} options={[{ value: "all", label: "Todas" }, { value: "vende", label: "Comprar" }, { value: "compra_busca", label: "Vender" }]} />
          <ToolbarChoices
            label="Estado"
            value={offerStatus}
            onChange={setOfferStatus}
            options={[
              { value: "all", label: "Todas" },
              { value: "evaluating", label: "Evaluando" },
              { value: "purchased", label: "Compradas" },
              { value: "discarded", label: "Descartadas" },
            ]}
          />
          </>
        }
        sorting={
          <ToolbarSort
            value={offerSort}
            direction={offerDirection}
            onChange={(value, dir) => {
              setOfferSort(value);
              setOfferDirection(dir);
            }}
            options={[
              { value: "date", label: "Fecha", defaultDesc: true },
              { value: "name", label: "Nombre" },
              { value: "value", label: "Valor de mercado", defaultDesc: true },
              { value: "gain", label: "Impacto en mazos", defaultDesc: true },
            ]}
          />
        }
        display={
          <ToolbarChoices
            label="Vista"
            value={offerView}
            onChange={setOfferView}
            options={[
              { value: "grid", label: "Cuadrícula" },
              { value: "list", label: "Listado" },
            ]}
          />
        }
      />

      {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
      {isLoadingDiscovery && <p role="status" className="text-sm text-muted-foreground">Buscando ofertas adicionales…</p>}
      {discoveryError && <p role="alert" className="text-sm text-destructive">{discoveryError}</p>}
      {importing && <p role="status" className="text-sm text-muted-foreground">Importando oferta…</p>}
      {/* Content Area */}
      {isLoadingList ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Cargando colecciones simuladas...</p>
        </div>
      ) : visibleOffers.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border bg-card/30 space-y-4">
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <FlaskConical className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-base font-medium text-foreground">{collections.length ? "No hay ofertas con estos filtros" : "No tienes colecciones simuladas"}</h4>
            <p className="text-xs text-muted-foreground">
              Puedes pegar un lote de cartas que estés pensando en comprar o cambiar para ver su impacto económico y cuánto mejoran tus mazos.
            </p>
          </div>
          {collections.length > 0 && <Button variant="ghost" className="min-h-11" onClick={() => {setOfferQuery("");setOfferStatus("all");}}>Restablecer filtros</Button>}
          <Button onClick={handleOpenNew} variant="outline" className="gap-2 text-xs border-border">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Pegar tabla del vendedor
          </Button>
        </div>
      ) : (
        /* Grid of Saved Collections */
        <div className={`grid gap-4 ${offerView === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
          {visibleOffers.map((coll) => (
            <div
              key={coll.id}
              onClick={() => void handleSelectCollection(coll.id)}
              role="button" tabIndex={0} aria-disabled={importing}
              onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); void handleSelectCollection(coll.id); } }}
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
                  {!coll.id.startsWith("discovery:") && <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDeleteFromList(e, coll.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    title="Eliminar oferta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>}
                </div>

                <p className="text-xs text-muted-foreground">{coll.origin === "whatsapp" ? "WhatsApp" : coll.origin === "cardmarket" ? "Cardmarket" : coll.origin === "in_person" ? "Venta presencial" : "Otros"} · {coll.opportunitySubject === "compra_busca" ? "Vender" : "Comprar"}{coll.id.startsWith("discovery:") ? " · Detectada" : ""}</p>
                {coll.opportunityMatches && <p className="text-xs text-muted-foreground">{coll.opportunityMatches.total_cards_scanned} cartas analizadas · {coll.opportunityMatches.total_wants_matches + coll.opportunityMatches.total_collection_matches} coincidencias · Completitud global {(coll.globalCompletionBefore ?? 0).toFixed(2)}% → {(coll.globalCompletionAfter ?? 0).toFixed(2)}%</p>}
                {coll.origin === "cardmarket" && coll.purchaseAnalysis && (
                  <p className="text-sm text-foreground">
                    {coll.status === "purchased" ? "Comprada" : coll.status === "discarded" ? "Descartada" : "Evaluando"} · Compra: {coll.purchaseAnalysis.totalPurchaseCost.toFixed(2)} € · Wants: {coll.purchaseAnalysis.wantsCompletionPercentage.toFixed(1)}%
                  </p>
                )}
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

                  {coll.opportunitySubject !== "compra_busca" && <Button
                    size="sm" variant="outline" className="min-h-11 w-full" aria-label={`Añadir ${coll.name} a colección`}
                    disabled={!!preparingOfferId || coll.status === "purchased" || coll.status === "discarded" || coll.totalCards === 0}
                    onClick={event => { event.stopPropagation(); void prepareAcquisition(coll); }}>
                    {preparingOfferId === coll.id ? "Cargando…" : coll.status === "purchased" ? "En colección" : "Añadir a colección"}
                  </Button>}

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

      {collectionDialog}
      {acquisitionError && <p role="alert" className="text-sm text-destructive">{acquisitionError}</p>}
      {bulkActionMessage && <p role="status" className="text-sm text-emerald-400">{bulkActionMessage}</p>}
      {/* Creation Modal Dialog (Only used when clicking "Evaluar nueva oferta") */}
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
