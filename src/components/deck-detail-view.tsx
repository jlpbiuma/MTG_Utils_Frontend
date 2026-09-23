"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CardImage as Image } from "@/components/card-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import { FloatingDeckControls } from "@/components/floating-deck-controls";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Filter,
  BookmarkPlus,
  Info,
  ChevronDown,
  ChevronRight,
  FolderTree,
  AlignJustify,
  Crown,
  Search,
  BarChart3,
  Shuffle,
  SlidersHorizontal,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { CardSearchDialog } from "@/components/card-search-dialog";
import { EdhrecRecommendations } from "@/components/edhrec-recommendations";
import { SelectCommanderDialog } from "@/components/select-commander-dialog";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { RequestedDecksBadge } from "@/components/requested-decks-badge";
import { getCardNamed, CardPrintingDetail } from "@/actions/scryfall";
import { ConfirmDeleteDeckDialog } from "@/components/confirm-delete-deck-dialog";
import { DeckAnalyticsView } from "@/components/deck-analytics-view";
import { DeckMulliganSimulator } from "@/components/deck-mulligan-simulator";
import { MoxfieldDeckEditor } from "@/components/moxfield-deck-editor";
import { TabErrorBoundary } from "@/components/tab-error-boundary";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import {
  extractColorsFromManaCost,
  buildColorIdentity,
} from "@/lib/deck-colors";
import {
  DeckDetailWithStats,
  DeckCardWithOwnership,
  DeckRequirement,
} from "@/lib/schemas";
import {
  addCardToDeck,
  updateDeckCardQuantity,
  removeCardFromDeck,
  assignCardToDeck,
  unassignCardFromDeck,
  reassignCardToDeck,
  deleteDeck,
  addMissingCardsToCollection,
  addMissingCardToCollection,
  archiveDeck,
  moveCardToSideboard,
} from "@/actions/decks";
import { addOrIncrementWant, addDeckMissingToWants } from "@/actions/wants";
import { PriceProvider, PriceSummary } from "@/lib/pricing";
import { PricingProviderSelector } from "@/components/pricing-provider-selector";
import { PriceBadge } from "@/components/price-badge";
import { CardSortingBar } from "@/components/card-sorting-bar";
import { PriceFilter } from "@/components/price-filter";
import {
  SortField,
  SortDirection,
  sortCards,
  matchesPriceFilter,
} from "@/lib/sorting";
import {
  normalizeCardName,
  groupCardsByType,
  isBasicLand,
} from "@/lib/card-utils";

interface DeckDetailViewProps {
  initialDeck: DeckDetailWithStats;
  recommendation?: {
    priceSummary: PriceSummary;
    unpricedCards: number;
    unfilledSlots: number;
    typeQuotas?: Partial<
      Record<import("@/lib/card-utils").CardTypeCategory, number>
    >;
    basicLandQuota?: number;
  };
}

export function DeckDetailView({
  initialDeck,
  recommendation,
}: DeckDetailViewProps) {
  const router = useRouter();
  const readOnly = !!recommendation;
  const [deckInfo, setDeckInfo] = useState({
    name: initialDeck.name,
    format: initialDeck.format,
    description: initialDeck.description,
    commander: initialDeck.commander,
    commanderScryfallId: initialDeck.commanderScryfallId,
    commanderImageUri: initialDeck.commanderImageUri,
  });
  const [activeTab, setActiveTab] = useState<
    "cards" | "editor" | "analytics_and_simulations" | "edhrec"
  >("cards");
  const [showCommanderModal, setShowCommanderModal] = useState(
    !initialDeck.commander,
  );
  const [showDeleteDeckDialog, setShowDeleteDeckDialog] = useState(false);
  const [isArchived, setIsArchived] = useState(!!initialDeck.isArchived);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleToggleArchive = async () => {
    if (isArchiving) return;
    setIsArchiving(true);
    const nextState = !isArchived;
    setIsArchived(nextState);
    try {
      await archiveDeck(initialDeck.id, nextState);
      router.refresh();
    } catch (error) {
      console.error("Error toggling archive status:", error);
      setIsArchived(!nextState);
    } finally {
      setIsArchiving(false);
    }
  };

  const [cards, setCards] = useState<DeckCardWithOwnership[]>(
    initialDeck.cards,
  );

  useEffect(() => {
    setCards(initialDeck.cards);
  }, [initialDeck.cards]);

  const deckColors = React.useMemo(() => {
    if (initialDeck.colors && initialDeck.colors.length > 0) {
      return initialDeck.colors;
    }
    const colorSet = new Set<string>();
    (cards || []).forEach((c) => {
      extractColorsFromManaCost(c.manaCost).forEach((col) => colorSet.add(col));
    });
    return Array.from(colorSet);
  }, [initialDeck.colors, cards]);

  const handleConfirmDeleteDeck = async (
    reassignments?: { targetDeckCardId: string; quantity: number }[],
  ) => {
    await deleteDeck(initialDeck.id, reassignments);
    router.push("/decks");
  };

  const [filterMode, setFilterMode] = useState<"all" | "missing" | "owned">(
    "all",
  );
  const [cardSearch, setCardSearch] = useState("");
  const [activeBoard, setActiveBoard] = useState<"mainboard" | "sideboard">(
    "mainboard",
  );
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [isTransferringMissing, setIsTransferringMissing] = useState(false);
  const [isAddingMissingToWants, setIsAddingMissingToWants] = useState(false);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<{
    id?: string;
    deckCardId?: string;
    cardScryfallId?: string;
    cardName: string;
    imageUri?: string | null;
    manaCost?: string | null;
    typeLine?: string | null;
    quantity?: number;
    ownedInCollection?: number;
    missingCount?: number;
    assignedQuantity?: number;
    requestedInDecks?: DeckRequirement[];
    requestedInDecksCount?: number;
    isCommander?: boolean;
  } | null>(null);

  const handleVersionSelect = (version: CardPrintingDetail) => {
    const newImageUri: string | null = (version.image_uri ||
      version.image_uri_large ||
      version.image_uri_small ||
      null) as string | null;
    const newSetCode: string | null = (version.set_code || null) as
      string | null;
    const targetCardId =
      selectedCardForDetail?.deckCardId || selectedCardForDetail?.id;

    if (targetCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === targetCardId
            ? {
                ...c,
                cardScryfallId: version.id,
                imageUri: newImageUri,
                setCode: newSetCode,
              }
            : c,
        ),
      );
    } else if (selectedCardForDetail?.cardName) {
      setCards((prev) =>
        prev.map((c) =>
          c.cardName.toLowerCase() ===
          selectedCardForDetail.cardName.toLowerCase()
            ? {
                ...c,
                cardScryfallId: version.id,
                imageUri: newImageUri,
                setCode: newSetCode,
              }
            : c,
        ),
      );
    }

    if (
      selectedCardForDetail?.isCommander ||
      selectedCardForDetail?.cardName?.toLowerCase() ===
        deckInfo.commander?.toLowerCase()
    ) {
      setDeckInfo((prev) => ({
        ...prev,
        commanderScryfallId: version.id,
        commanderImageUri: newImageUri,
      }));
    }

    setSelectedCardForDetail((prev) =>
      prev
        ? {
            ...prev,
            cardScryfallId: version.id,
            imageUri: newImageUri,
            setCode: newSetCode,
          }
        : null,
    );

    router.refresh();
  };

  const handleOpenCommanderDetail = () => {
    const commanderCard = cards.find(
      (c) =>
        c.isCommander ||
        c.cardName.toLowerCase() === deckInfo.commander?.toLowerCase(),
    );
    setSelectedCardForDetail({
      id: commanderCard?.id,
      deckCardId: commanderCard?.id,
      cardScryfallId:
        deckInfo.commanderScryfallId || commanderCard?.cardScryfallId,
      cardName: deckInfo.commander!,
      imageUri: deckInfo.commanderImageUri || commanderCard?.imageUri,
      manaCost: commanderCard?.manaCost,
      typeLine: commanderCard?.typeLine,
      quantity: commanderCard?.quantity,
      ownedInCollection: commanderCard?.ownedInCollection,
      missingCount: commanderCard?.missingCount,
      assignedQuantity: commanderCard?.assignedQuantity,
      requestedInDecks: commanderCard?.requestedInDecks,
      requestedInDecksCount: commanderCard?.requestedInDecksCount,
      isCommander: true,
    });
  };

  const handleTransferAllMissing = async () => {
    setIsTransferringMissing(true);
    try {
      const res = await addMissingCardsToCollection(initialDeck.id);
      if (res.success) {
        setCards((prev) =>
          prev.map((c) => {
            if (c.missingCount > 0) {
              return {
                ...c,
                ownedInCollection: Math.max(c.ownedInCollection, c.quantity),
                assignedQuantity: c.quantity,
                missingCount: 0,
                availableToAssign: 0,
              };
            }
            return c;
          }),
        );
        router.refresh();
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Error al transferir cartas faltantes",
      );
    } finally {
      setIsTransferringMissing(false);
    }
  };

  const [addingWant, setAddingWant] = useState<string | null>(null);
  const [wantError, setWantError] = useState<string | null>(null);
  const handleAddWant = async (card: DeckCardWithOwnership) => {
    if (addingWant || card.isInWant) return;
    setAddingWant(card.id);
    setWantError(null);
    try {
      const id = card.cardScryfallId || (await getCardNamed(card.cardName, true))?.id;
      if (!id) throw new Error("No se pudo resolver la impresión de esta carta. Inténtalo de nuevo.");
      await addOrIncrementWant({ cardScryfallId: id, cardName: card.cardName,
        quantity: 1, manaCost: card.manaCost, typeLine: card.typeLine,
        imageUri: card.imageUri, setCode: card.setCode });
      setCards(previous => previous.map(c => normalizeCardName(c.cardName) === normalizeCardName(card.cardName) ? { ...c, isInWant: true } : c));
    } catch (error) {
      setWantError(error instanceof Error ? error.message : "No se pudo añadir a Wants.");
    } finally {
      setAddingWant(null);
    }
  };

  const handleAddAllMissingToWants = async () => {
    setIsAddingMissingToWants(true);
    try {
      const res = await addDeckMissingToWants(initialDeck.id);
      if (res.addedCount > 0) {
        alert(
          `¡Éxito! Se han añadido ${res.addedCount} cartas a tu lista de Wants.`,
        );
      } else {
        alert(
          "Todas las cartas faltantes de este mazo ya están en tus Wants o no hay cartas faltantes.",
        );
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Error al añadir cartas faltantes a wants",
      );
    } finally {
      setIsAddingMissingToWants(false);
    }
  };

  // View mode: Grouped by card type vs Continuous flat list
  const [isGroupedByType, setIsGroupedByType] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Sorting state
  const [sortField, setSortField] = useState<SortField>(
    readOnly ? "inclusion" : "name",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    readOnly ? "desc" : "asc",
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Dynamic pricing state
  const [priceProvider, setPriceProvider] =
    useState<PriceProvider>("cardmarket");
  const [loadedPriceSummary, setPriceSummary] = useState<PriceSummary | null>(
    () => {
      if (recommendation) return recommendation.priceSummary;
      if (initialDeck.totalValue != null) {
        const net = initialDeck.totalValue;
        const missing = initialDeck.missingValue ?? 0;
        const owned =
          initialDeck.ownedValue ??
          Math.max(0, Math.round((net - missing) * 100) / 100);
        return {
          provider: "cardmarket",
          currency: initialDeck.currency || "EUR",
          currencySymbol: initialDeck.currencySymbol || "€",
          totalCards: initialDeck.totalCards,
          totalNetValue: net,
          totalMissingValue: missing,
          totalOwnedValue: owned,
          quotes: {},
        };
      }
      return null;
    },
  );
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  const loadPrices = useCallback(
    async (providerToLoad = priceProvider, bypassCache = false) => {
      if (readOnly) return;
      setIsLoadingPrices(true);
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId: initialDeck.id,
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
        console.error("Failed to load deck prices:", err);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [initialDeck.id, priceProvider, readOnly],
  );

  useEffect(() => {
    if (!readOnly) loadPrices(priceProvider, false);
  }, [priceProvider, loadPrices, readOnly]);

  const priceSummary = recommendation?.priceSummary ?? loadedPriceSummary;

  const mainboardCards = cards.filter((c) => !c.isSideboard);
  const sideboardCards = cards.filter((c) => c.isSideboard);
  const mainboardCount = React.useMemo(
    () => mainboardCards.reduce((acc, c) => acc + c.quantity, 0),
    [mainboardCards],
  );
  const activeCards =
    activeBoard === "mainboard" ? mainboardCards : sideboardCards;

  const parsedMinPrice = minPrice.trim() !== "" ? parseFloat(minPrice) : null;
  const parsedMaxPrice = maxPrice.trim() !== "" ? parseFloat(maxPrice) : null;

  const filteredCards = activeCards.filter((c) => {
    if (
      cardSearch.trim() &&
      !c.cardName.toLowerCase().includes(cardSearch.trim().toLowerCase())
    ) {
      return false;
    }
    if (filterMode === "missing" && c.missingCount <= 0) return false;
    if (filterMode === "owned" && c.ownedInCollection < c.quantity)
      return false;
    if (
      !matchesPriceFilter(
        c.cardName,
        c.cardScryfallId,
        parsedMinPrice,
        parsedMaxPrice,
        priceSummary?.quotes,
      )
    ) {
      return false;
    }
    return true;
  });

  const handleAddCard = async (cardData: {
    cardScryfallId: string;
    cardName: string;
    quantity: number;
    manaCost?: string | null;
    typeLine?: string | null;
    imageUri?: string | null;
    isSideboard?: boolean;
  }) => {
    await addCardToDeck(initialDeck.id, {
      cardScryfallId: cardData.cardScryfallId,
      cardName: cardData.cardName,
      quantity: cardData.quantity,
      isSideboard: cardData.isSideboard ?? activeBoard === "sideboard",
      manaCost: cardData.manaCost,
      typeLine: cardData.typeLine,
      imageUri: cardData.imageUri,
    });
  };

  const handleUpdateQuantity = async (
    cardId: string,
    currentQty: number,
    delta: number,
  ) => {
    setLoadingCardId(cardId);
    try {
      const newQty = currentQty + delta;
      await updateDeckCardQuantity(cardId, newQty);
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleRemove = async (cardId: string) => {
    if (!confirm("¿Quitar esta carta del mazo?")) return;
    setLoadingCardId(cardId);
    try {
      await removeCardFromDeck(cardId);
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleAssign = async (cardId: string) => {
    setLoadingCardId(cardId);
    try {
      await assignCardToDeck(cardId, 1);
    } catch (err: any) {
      alert(err?.message || "Error al asignar carta");
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleUnassign = async (cardId: string) => {
    setLoadingCardId(cardId);
    try {
      await unassignCardFromDeck(cardId, 1);
    } catch (err: any) {
      alert(err?.message || "Error al liberar carta");
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleReassign = async (
    fromDeckId: string,
    toDeckCardId: string,
    cardName: string,
  ) => {
    setLoadingCardId(toDeckCardId);
    try {
      await reassignCardToDeck(fromDeckId, toDeckCardId, cardName, 1);
    } catch (err: any) {
      alert(err?.message || "Error al reasignar carta");
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleAddMissingToCollection = async (card: DeckCardWithOwnership) => {
    setLoadingCardId(card.id);
    try {
      await addMissingCardToCollection(initialDeck.id, card.id);
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === card.id) {
            const added = c.missingCount || 1;
            return {
              ...c,
              ownedInCollection: c.ownedInCollection + added,
              assignedQuantity: c.quantity,
              missingCount: 0,
              availableToAssign: 0,
            };
          }
          return c;
        }),
      );
      router.refresh();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Error al añadir carta faltante",
      );
    } finally {
      setLoadingCardId(null);
    }
  };

  const handleToggleSideboard = async (card: DeckCardWithOwnership) => {
    setLoadingCardId(card.id);
    try {
      const nextSideboard = !card.isSideboard;
      const res = await moveCardToSideboard(
        card.id,
        nextSideboard,
        initialDeck.id,
      );
      if (res.success) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, isSideboard: nextSideboard } : c,
          ),
        );
        router.refresh();
      } else {
        alert(res.error || "Error al mover la carta");
      }
    } catch (err: any) {
      alert(err?.message || "Error al mover la carta");
    } finally {
      setLoadingCardId(null);
    }
  };

  const sortedCards = sortCards(
    filteredCards,
    sortField,
    sortDirection,
    priceSummary,
  );
  const groupedSections = groupCardsByType(sortedCards, priceSummary, {
    excludeBasicLands: false,
  });

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedSections.forEach((s) => {
      allCollapsed[s.key] = true;
    });
    setCollapsedSections(allCollapsed);
  };

  const expandAll = () => {
    setCollapsedSections({});
  };

  const stats = React.useMemo(() => {
    if (readOnly)
      return {
        totalCards: initialDeck.totalCards,
        ownedCards: initialDeck.ownedCards,
        missingCardsCount: initialDeck.missingCardsCount,
        completionPercentage: initialDeck.completionPercentage,
        isComplete:
          initialDeck.totalCards > 0 && initialDeck.missingCardsCount === 0,
      };
    let total = 0;
    let owned = 0;
    for (const c of cards || []) {
      if (c.isSideboard) continue;
      const isBasic = isBasicLand(c.typeLine, c.cardName);
      total += c.quantity;
      if (isBasic) {
        owned += c.quantity;
      } else {
        const actualOwned = Math.min(
          c.quantity,
          Math.max(
            c.assignedQuantity || 0,
            Math.min(c.ownedInCollection || 0, c.quantity),
          ),
        );
        owned += actualOwned;
      }
    }
    const missing = Math.max(0, total - owned);
    const pct =
      total > 0
        ? Math.round((owned / total) * 100)
        : (initialDeck.completionPercentage ?? 100);
    return {
      totalCards: total || initialDeck.totalCards,
      ownedCards: total > 0 ? owned : initialDeck.ownedCards,
      missingCardsCount: total > 0 ? missing : initialDeck.missingCardsCount,
      completionPercentage: total > 0 ? pct : initialDeck.completionPercentage,
      isComplete:
        (total || initialDeck.totalCards) > 0 &&
        (total > 0 ? missing === 0 : initialDeck.missingCardsCount === 0),
    };
  }, [readOnly, cards, initialDeck]);

  const isComplete = stats.isComplete;

  const renderCardRow = (card: DeckCardWithOwnership) => {
    const isBasic = !readOnly && isBasicLand(card.typeLine, card.cardName);
    const isCardComplete = isBasic || card.ownedInCollection >= card.quantity;
    const isBusy = loadingCardId === card.id;

    return (
      <div
        key={card.id}
        onClick={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest("button, a, input, select, textarea")
          ) {
            return;
          }
          setSelectedCardForDetail(card);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedCardForDetail(card);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalles de ${card.cardName}`}
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-colors hover:bg-accent/30 ${
          isBasic || isCardComplete
            ? "border-l-4 border-l-emerald-500/80"
            : "border-l-4 border-l-primary"
        } cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {/* Left: Card art hover + Name + Types + Mana Cost */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => setSelectedCardForDetail(card)}
            className="cursor-pointer"
            title="Ver todos los datos en español"
          >
            <CardPreviewHover
              cardName={card.cardName}
              imageUri={card.imageUri}
              className="shrink-0"
            >
              {card.imageUri ? (
                <Image
                  src={card.imageUri}
                  alt={card.cardName}
                  width={44}
                  height={64}
                  sizes="44px"
                  className="w-11 h-16 object-cover rounded-md border border-border hover:border-primary transition-colors "
                />
              ) : (
                <div className="w-11 h-16 rounded-md bg-accent border border-border flex items-center justify-center text-xs text-muted-foreground">
                  MTG
                </div>
              )}
            </CardPreviewHover>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                onClick={() => setSelectedCardForDetail(card)}
                className="cursor-pointer"
                title="Ver todos los datos en español"
              >
                <CardPreviewHover
                  cardName={card.cardName}
                  imageUri={card.imageUri}
                >
                  <span className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-base">
                    {card.cardName}
                  </span>
                </CardPreviewHover>
              </div>

              <ManaCost manaCost={card.manaCost} />
            </div>

            {readOnly && (
              <div className="flex flex-wrap gap-2 mt-1 text-xs">
                {card.isTopCard && <Badge variant="outline">Top Cards</Badge>}
                {card.isHighSynergy && (
                  <Badge variant="outline">Alta sinergia</Badge>
                )}
                <span>Inclusión: {(card.inclusionPct ?? 0).toFixed(1)}%</span>
                <span>Sinergia: {(card.synergy ?? 0).toFixed(1)}%</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {card.typeLine || "Card"}
            </p>

            {/* Collection status pill */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {isBasic ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  <CheckCircle2 className="h-3 w-3" />
                  Tierra básica · {card.quantity} en mazo (disponibles)
                </span>
              ) : isCardComplete ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  <CheckCircle2 className="h-3 w-3" />
                  Tienes {card.ownedInCollection} de {card.quantity}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/50">
                  <AlertCircle className="h-3 w-3" />
                  Faltan {card.missingCount} copias (tienes{" "}
                  {card.ownedInCollection}/{card.quantity})
                </span>
              )}

              {!readOnly && !isBasic && !isCardComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddMissingToCollection(card)}
                  disabled={isBusy}
                  className="h-6 text-[11px] px-2 gap-1 text-rose-300 border-rose-500/40 hover:bg-rose-500/10 hover:border-rose-400"
                  title="Añadir automáticamente las copias faltantes a tu colección física"
                >
                  <BookmarkPlus className="h-3 w-3" />
                  Tengo las faltantes
                </Button>
              )}
            </div>

            {!readOnly && (
              <>
                {/* Physical Assignment status pill & actions */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {card.assignedQuantity > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/60 "
                        title="Copias de tu colección física asignadas a este mazo"
                      >
                        🎯 Asignada ({card.assignedQuantity}/{card.quantity})
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnassign(card.id)}
                        disabled={isBusy}
                        className="h-6 text-[11px] px-2 text-muted-foreground hover:text-rose-300 hover:bg-rose-950/30"
                        title="Liberar 1 copia física de vuelta a tu colección libre"
                      >
                        Liberar
                      </Button>
                    </div>
                  )}

                  {card.assignedQuantity < card.quantity && (
                    <>
                      {card.availableToAssign > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssign(card.id)}
                          disabled={isBusy}
                          className="h-6 text-[11px] px-2 gap-1 text-sky-300 border-sky-500/40 hover:bg-sky-500/10 hover:border-sky-400"
                          title="Asignar una copia física disponible de tu colección a este mazo"
                        >
                          📥 Asignar al mazo ({card.availableToAssign} disp.)
                        </Button>
                      ) : card.assignedInOtherDecks &&
                        card.assignedInOtherDecks.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-primary bg-secondary px-2.5 py-1 rounded border border-primary/30">
                          <span className="font-semibold text-primary">
                            ⚠️ Asignada en:
                          </span>
                          {card.assignedInOtherDecks.map((other) => (
                            <span
                              key={other.deckId}
                              className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30 text-foreground font-medium"
                            >
                              <span>
                                {other.deckName} ({other.quantity})
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleReassign(
                                    other.deckId,
                                    card.id,
                                    card.cardName,
                                  )
                                }
                                disabled={isBusy}
                                className="h-4 text-[10px] px-1 text-primary hover:text-foreground underline font-bold"
                                title={`Reasignar copia física desde ${other.deckName} a este mazo`}
                              >
                                Reasignar aquí
                              </Button>
                            </span>
                          ))}
                        </div>
                      ) : card.ownedInCollection === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          (No la tienes en colección)
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </>
            )}
            {readOnly && <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {card.assignedInOtherDecks.map(other => <Link key={other.deckId} href={`/decks/${other.deckId}`} className="text-sky-300 underline" onClick={event => event.stopPropagation()}>
                Asignada en {other.deckName}: {other.quantity}
              </Link>)}
              {card.ownedInCollection > 0 && <span className="text-muted-foreground">Colección libre: {card.availableToAssign}</span>}
            </div>}
            {card.ownedInCollection === 0 && <Button size="sm" variant="outline" className="mt-2 gap-1.5"
              disabled={!!addingWant || card.isInWant}
              onClick={() => handleAddWant(card)}>
              <BookmarkPlus className="h-3.5 w-3.5" />
              {card.isInWant ? "En Wants" : addingWant === card.id ? "Añadiendo..." : "Añadir a Wants"}
            </Button>}

            {/* Global Deck Demand / Priority for missing cards */}
            {(card.requestedInDecksCount ?? card.requestedInDecks?.length ?? 0) > 0 && (
              <RequestedDecksBadge
                cardName={card.cardName}
                decks={card.requestedInDecks}
                count={card.requestedInDecksCount}
              />
            )}
          </div>
        </div>

        {/* Right: Price Badge + Quantity controls & Delete */}
        <div className="flex items-center justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border flex-wrap sm:flex-nowrap">
          <PriceBadge
            quote={
              priceSummary?.quotes[card.cardScryfallId] ||
              priceSummary?.quotes[normalizeCardName(card.cardName)]
            }
            showSubtotal={true}
          />

          {!readOnly && (
            <>
              <div className="flex items-center bg-background border border-border rounded-lg p-1 gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={isBusy}
                  onClick={() =>
                    handleUpdateQuantity(card.id, card.quantity, -1)
                  }
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>

                <span className="font-mono font-bold text-sm min-w-[20px] text-center text-foreground">
                  {card.quantity}
                </span>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={isBusy}
                  onClick={() =>
                    handleUpdateQuantity(card.id, card.quantity, 1)
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                disabled={isBusy}
                onClick={() => handleToggleSideboard(card)}
                title={
                  card.isSideboard ? "Mover al Mainboard" : "Mover al Sideboard"
                }
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  {card.isSideboard ? "A Mainboard" : "A Sideboard"}
                </span>
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30"
                disabled={isBusy}
                onClick={() => handleRemove(card.id)}
                title="Eliminar carta del mazo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`mx-auto py-8 space-y-8 transition-all duration-150 ${
        activeTab === "edhrec" || activeTab === "editor"
          ? "w-full max-w-full pl-0 sm:pl-1 lg:pl-2 pr-2 sm:pr-4 lg:pr-6"
          : "container mx-auto px-4 max-w-6xl"
      }`}
    >
      {/* Top back navigation */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link href={readOnly ? "/decks?tab=edhrec" : "/decks"}>
            <ArrowLeft className="h-4 w-4" />
            Volver a la lista de mazos
          </Link>
        </Button>
      </div>

      {recommendation && (
        <div
          className="rounded-lg border border-border bg-card p-4 space-y-2"
          role="status"
        >
          <p className="font-semibold">Recomendación EDHREC · Vista previa</p>
          <p>
            Valor usado de la colección (estimación por cupos):{" "}
            <strong>
              {(recommendation.priceSummary.totalOwnedValue ?? 0).toFixed(2)} €
            </strong>
          </p>
          {recommendation.unpricedCards > 0 && (
            <p className="text-sm text-muted-foreground">
              Valor parcial: {recommendation.unpricedCards} cartas sin precio
              disponible.
            </p>
          )}
          {recommendation.unfilledSlots > 0 && (
            <p className="text-sm text-muted-foreground">
              EDHREC no ofrece cartas suficientes para cubrir{" "}
              {recommendation.unfilledSlots} huecos; no se incluyen en el
              precio.
            </p>
          )}
        </div>
      )}

      {wantError && <p role="alert" className="text-rose-400">{wantError}</p>}

      {/* Deck Header Banner */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-8 ">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 font-mono"
              >
                {deckInfo.format}
              </Badge>
              {deckColors.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-background border border-border text-xs ">
                  <ColorIdentityPips colors={deckColors} size="xs" />
                  <span className="font-mono text-[11px] font-bold text-muted-foreground">
                    {initialDeck.colorIdentity ||
                      buildColorIdentity(deckColors)}
                  </span>
                </div>
              )}
              {isComplete && (
                <Badge variant="success" className="gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  Mazo Completo
                </Badge>
              )}
              {isArchived && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium"
                >
                  Archivado
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                {deckInfo.name}
              </h1>

              {!readOnly && (
                <>
                  <div className="flex items-center gap-2">
                    <EditDeckDialog
                      deck={{
                        id: initialDeck.id,
                        name: deckInfo.name,
                        format: deckInfo.format,
                        description: deckInfo.description,
                        commander: deckInfo.commander,
                      }}
                      deckCards={initialDeck.cards}
                      onUpdated={(updated) => {
                        setDeckInfo((prev) => ({ ...prev, ...updated }));
                        router.refresh();
                      }}
                    />

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isArchiving}
                      onClick={handleToggleArchive}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border"
                      title={
                        isArchived
                          ? "Desarchivar este mazo"
                          : "Archivar este mazo"
                      }
                    >
                      {isArchived ? (
                        <>
                          <ArchiveRestore className="h-3.5 w-3.5 mr-1 text-amber-500" />
                          Desarchivar
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5 mr-1 hover:text-amber-500" />
                          Archivar
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDeleteDeckDialog(true)}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 border border-border hover:border-rose-800/50"
                      title="Eliminar este mazo permanentemente"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-muted-foreground hover:text-rose-400" />
                      Eliminar
                    </Button>
                  </div>
                </>
              )}
            </div>

            {deckInfo.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">
                {deckInfo.description}
              </p>
            )}

            {/* Designated Commander Header Display */}
            {deckInfo.commander ? (
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div
                  onClick={handleOpenCommanderDetail}
                  className="cursor-pointer"
                  title="Ver todos los datos del comandante en español"
                >
                  <CardPreviewHover
                    cardName={deckInfo.commander}
                    imageUri={deckInfo.commanderImageUri}
                  >
                    {deckInfo.commanderImageUri ? (
                      <Image
                        src={deckInfo.commanderImageUri}
                        alt={deckInfo.commander}
                        width={40}
                        height={56}
                        sizes="40px"
                        className="w-10 h-14 object-cover rounded-md border-2 border-primary/30 shrink-0 hover:border-primary transition-colors"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-md bg-accent border-2 border-primary/30 flex items-center justify-center text-primary text-xs shrink-0">
                        <Crown className="w-5 h-5" />
                      </div>
                    )}
                  </CardPreviewHover>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-primary" />
                      <span>Comandante</span>
                    </div>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowCommanderModal(true)}
                          className="text-[11px] text-primary/80 hover:text-primary underline font-medium cursor-pointer transition-colors"
                          title="Cambiar el comandante de este mazo"
                        >
                          (Cambiar)
                        </button>
                      </>
                    )}
                  </div>
                  <div
                    onClick={handleOpenCommanderDetail}
                    className="cursor-pointer"
                    title="Ver todos los datos del comandante en español"
                  >
                    <CardPreviewHover
                      cardName={deckInfo.commander}
                      imageUri={deckInfo.commanderImageUri}
                    >
                      <span className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-base truncate block">
                        {deckInfo.commander}
                      </span>
                    </CardPreviewHover>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCommanderModal(true)}
                  className="text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-primary" />
                  Asignar Comandante para EDHREC
                </Button>
              </div>
            )}
          </div>

          {/* Quick completion badge widget */}
          <div className="p-4 rounded-lg bg-background border border-border min-w-[240px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Estado de Colección
              </span>
              <span
                className={`font-mono font-semibold text-lg ${
                  isComplete
                    ? "text-emerald-400"
                    : initialDeck.completionPercentage > 50
                      ? "text-primary"
                      : "text-foreground"
                }`}
              >
                {stats.completionPercentage}%
              </span>
            </div>

            <Progress
              value={stats.completionPercentage}
              indicatorClassName={
                isComplete
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-primary"
              }
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                <strong className="text-foreground">{stats.ownedCards}</strong>{" "}
                / {stats.totalCards} cartas
              </span>
              {stats.missingCardsCount > 0 ? (
                <span className="text-rose-400/90 font-medium">
                  Faltan {stats.missingCardsCount} cartas
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">
                  100% en mano
                </span>
              )}
            </div>

            {!readOnly && stats.missingCardsCount > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTransferAllMissing}
                  disabled={isTransferringMissing}
                  className="flex-1 text-xs font-semibold bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400 gap-1.5 h-8 transition-all"
                  title="Añade todas las cartas faltantes de este mazo a tu inventario físico"
                >
                  {isTransferringMissing ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
                      <span>Transfiriendo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Tengo las faltantes</span>
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAllMissingToWants}
                  disabled={isAddingMissingToWants}
                  className="flex-1 text-xs font-semibold bg-indigo-950/40 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-400 gap-1.5 h-8 transition-all"
                  title="Añade todas las cartas faltantes de este mazo a tu lista de Wants"
                >
                  {isAddingMissingToWants ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
                      <span>Añadiendo a Wants...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Añadir faltantes a Wants</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert if deck has more than 100 cards */}
      {!readOnly && mainboardCount > 100 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-400 text-sm">
                ¡Atención: El mazo principal tiene {mainboardCount} cartas!
              </p>
              <p className="text-xs text-amber-300/80">
                Supera el límite estándar de 100 cartas para formatos como
                Commander / EDH.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alert if deck has no commander */}
      {!deckInfo.commander && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-primary text-sm">
                ¡Atención: Este mazo no tiene un comandante asignado!
              </p>
              <p className="text-xs text-muted-foreground">
                Es imperativo definir un comandante para activar las
                recomendaciones comunitarias de EDHREC y estadísticas del mazo.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="mana"
            onClick={() => setShowCommanderModal(true)}
            className="gap-1.5 shrink-0"
          >
            <Crown className="w-3.5 h-3.5" />
            Asignar Comandante
          </Button>
        </div>
      )}

      {/* Select Commander Modal */}
      {!readOnly && (
        <>
          <SelectCommanderDialog
            deckId={initialDeck.id}
            deckName={deckInfo.name}
            open={showCommanderModal}
            onOpenChange={setShowCommanderModal}
            deckCards={initialDeck.cards}
            currentCommander={deckInfo.commander}
            onCommanderSelected={(newCmd, newImg) => {
              setDeckInfo((prev) => ({
                ...prev,
                commander: newCmd,
                commanderImageUri: newImg || prev.commanderImageUri,
              }));
              router.refresh();
            }}
          />
        </>
      )}

      {/* Top View Mode Switcher: Deck Cards vs Analytics vs Mulligan vs EDHREC */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("cards")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "cards"
              ? "bg-accent text-foreground border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          <Layers className="h-4 w-4 text-primary" />
          <span>{readOnly ? "Cartas recomendadas" : "Cartas del Mazo"}</span>
          <Badge
            variant="outline"
            className="ml-1 text-xs bg-background border-border"
          >
            {readOnly ? cards.length : initialDeck.totalCards}
          </Badge>
        </button>

        {!readOnly && (
          <>
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "editor"
                  ? "bg-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 text-purple-400" />
              <span>Editar mazo</span>
            </button>
          </>
        )}

        {!readOnly && (
          <button
            onClick={() => setActiveTab("analytics_and_simulations")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "analytics_and_simulations"
                ? "bg-accent text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>Estadística y simulaciones</span>
          </button>
        )}

        {!readOnly && (
          <>
            <button
              onClick={() => setActiveTab("edhrec")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "edhrec"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-primary/80 hover:text-primary hover:bg-primary/10"
              }`}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Recomendaciones EDHREC</span>
            </button>
          </>
        )}
      </div>

      {activeTab === "editor" ? (
        <TabErrorBoundary tabName="Editor de mazo">
          <MoxfieldDeckEditor
            deck={initialDeck}
            cards={cards}
            priceSummary={priceSummary}
            priceProvider={priceProvider}
            onPriceProviderChange={(p) => setPriceProvider(p)}
            onCardsUpdated={setCards}
          />
        </TabErrorBoundary>
      ) : activeTab === "analytics_and_simulations" ? (
        <TabErrorBoundary tabName="Estadística y simulaciones">
          <div className="space-y-8">
            <DeckAnalyticsView cards={cards} colors={deckColors} />
            <DeckMulliganSimulator
              cards={cards}
              commanderName={deckInfo.commander}
            />
          </div>
        </TabErrorBoundary>
      ) : activeTab === "edhrec" ? (
        <TabErrorBoundary tabName="Recomendaciones EDHREC">
          <EdhrecRecommendations
            deckId={initialDeck.id}
            deckName={deckInfo.name}
            commander={deckInfo.commander || null}
            commanderImageUri={deckInfo.commanderImageUri || null}
            deckCards={cards}
            onCardAdded={() => {
              router.refresh();
            }}
            onCardRemoved={() => {
              router.refresh();
            }}
            onCommanderUpdated={(newCmd, newImg) => {
              setDeckInfo((prev) => ({
                ...prev,
                commander: newCmd,
                commanderImageUri: newImg || prev.commanderImageUri,
              }));
              router.refresh();
            }}
          />
        </TabErrorBoundary>
      ) : (
        <>
          {/* Dynamic Pricing Selector & Net Totals */}
          <PricingProviderSelector
            currentProvider={priceProvider}
            onProviderChange={(p) => setPriceProvider(p)}
            onRefreshPrices={async () =>
              readOnly ? router.refresh() : loadPrices(priceProvider, true)
            }
            summary={priceSummary}
            isLoading={isLoadingPrices}
            showMissingNetValue={true}
          />

          {/* Action Toolbar & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
            {/* Mainboard vs Sideboard Tabs */}
            <div className="flex items-center bg-secondary/80 p-1 rounded-lg border border-border h-9">
              <button
                onClick={() => setActiveBoard("mainboard")}
                className={`px-3 h-7 rounded-md text-xs font-semibold transition-all ${
                  activeBoard === "mainboard"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {readOnly ? "Recomendaciones" : "Mainboard"} (
                {mainboardCards.reduce((s, c) => s + c.quantity, 0)})
              </button>
              {!readOnly && (
                <button
                  onClick={() => setActiveBoard("sideboard")}
                  className={`px-3 h-7 rounded-md text-xs font-semibold transition-all ${
                    activeBoard === "sideboard"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sideboard (
                  {sideboardCards.reduce((s, c) => s + c.quantity, 0)})
                </button>
              )}
            </div>

            {/* Filters and Add Card */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="search"
                  value={cardSearch}
                  onChange={(event) => setCardSearch(event.target.value)}
                  placeholder="Buscar carta en el mazo..."
                  aria-label="Buscar carta en el mazo"
                  className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg border border-border text-xs">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterMode === "all"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterMode("missing")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterMode === "missing"
                      ? "bg-primary/20 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Solo Faltantes
                </button>
                <button
                  onClick={() => setFilterMode("owned")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterMode === "owned"
                      ? "bg-emerald-500/20 text-emerald-300 font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  En Colección
                </button>
              </div>

              <PriceFilter
                minPrice={minPrice}
                maxPrice={maxPrice}
                onMinPriceChange={setMinPrice}
                onMaxPriceChange={setMaxPrice}
                currencySymbol={priceSummary?.currencySymbol || "€"}
              />

              {!readOnly && (
                <>
                  <CardSearchDialog
                    onAddCard={handleAddCard}
                    title={`Añadir Carta a ${activeBoard === "mainboard" ? "Mainboard" : "Sideboard"}`}
                    triggerText="Buscar en Scryfall"
                    showSideboardOption={true}
                  />
                </>
              )}
            </div>
          </div>

          {/* Interactive Sorting & Grouping Bar */}
          {filteredCards.length > 0 && (
            <div className="p-3.5 rounded-lg bg-card border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Left: Sorting options */}
              <div className="flex-1">
                <CardSortingBar
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSortChange={(f, d) => {
                    setSortField(f);
                    setSortDirection(d);
                  }}
                  showStatusOption={true}
                  showEdhrecOptions={readOnly}
                />
              </div>

              {/* Right: Highly visible Grouping Parameter */}
              <div className="flex items-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-border shrink-0 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <FolderTree className="h-4 w-4 text-primary" />
                  Agrupar por:
                </span>

                <div className="inline-flex items-center bg-background p-1 rounded-lg border border-border shadow-inner">
                  <button
                    type="button"
                    onClick={() => setIsGroupedByType(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isGroupedByType
                        ? "bg-primary text-primary-foreground ring-1 ring-ring"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Agrupar cartas por Criaturas, Artefactos, Conjuros, Tierras, etc."
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    <span>Tipo de Carta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGroupedByType(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                      !isGroupedByType
                        ? "bg-accent text-foreground ring-1 ring-ring"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Mostrar todas las cartas en una lista continua sin divisiones"
                  >
                    <AlignJustify className="h-3.5 w-3.5" />
                    <span>Sin Agrupar</span>
                  </button>
                </div>

                {/* Quick collapse/expand all */}
                {isGroupedByType && groupedSections.length > 1 && (
                  <div className="flex items-center gap-1 pl-1 border-l border-border text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={expandAll}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      title="Desplegar todas las secciones de tipos"
                    >
                      Expandir todo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={collapseAll}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      title="Plegar todas las secciones de tipos"
                    >
                      Colapsar todo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card Table / List */}
          {filteredCards.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-lg border border-dashed border-border bg-card">
              <p className="text-muted-foreground">
                {filterMode === "missing"
                  ? "¡Excelente! No tienes cartas faltantes bajo este filtro."
                  : minPrice || maxPrice
                    ? "No se encontraron cartas en el mazo dentro del rango de precio seleccionado."
                    : cardSearch.trim()
                      ? `No se encontraron cartas que coincidan con «${cardSearch.trim()}».`
                      : "No hay cartas en esta sección aún."}
              </p>
              {(minPrice || maxPrice) && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Limpiar filtro de precio
                  </button>
                </div>
              )}
              {!readOnly && (
                <div className="mt-4">
                  <CardSearchDialog
                    onAddCard={handleAddCard}
                    title={`Añadir Carta a ${activeBoard}`}
                    triggerText="Añadir primera carta"
                  />
                </div>
              )}
            </div>
          ) : isGroupedByType ? (
            <div className="space-y-4">
              {groupedSections.map((section) => {
                const isCollapsed = !!collapsedSections[section.key];
                const isSectionComplete =
                  section.completionTotalCards === 0 ||
                  section.missingCards === 0;

                return (
                  <div
                    key={section.key}
                    className="overflow-hidden rounded-lg border border-border bg-card "
                  >
                    {/* Section Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="w-full flex flex-col md:flex-row md:items-center justify-between p-3.5 sm:p-4 bg-card hover:bg-accent border-b border-border transition-colors gap-3 text-left group"
                    >
                      {/* Left: Chevron + Group Title + Card Count Badge */}
                      <div className="flex items-center gap-3">
                        <span className="p-1 rounded bg-accent text-muted-foreground group-hover:text-foreground transition-colors">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors tracking-wide">
                            {section.label}
                            {readOnly && (
                              <span className="block text-sm font-normal text-muted-foreground">
                                {recommendation?.typeQuotas?.[section.key] ==
                                null
                                  ? section.key === "commanders" ? "Incluido en el valor del mazo" : "Alternativas adicionales"
                                  : `Elige ${recommendation.typeQuotas[section.key]}${section.key === "lands" ? " tierras no básicas" : " cartas"} para ajustarte a EDHREC`}
                                {section.key === "lands" &&
                                  !!recommendation?.basicLandQuota &&
                                  ` + ${recommendation.basicLandQuota} básicas`}
                              </span>
                            )}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-accent text-foreground border-border font-mono text-xs"
                          >
                            {section.totalCardsCount}{" "}
                            {section.totalCardsCount === 1 ? "carta" : "cartas"}
                          </Badge>
                        </div>
                      </div>

                      {readOnly ? (
                        <span className="text-sm text-muted-foreground">
                          {
                            section.cards.filter((c) => c.ownedInCollection > 0)
                              .length
                          }{" "}
                          de {section.cards.length} alternativas visibles en tu
                          colección ({Math.round(section.cards.filter(c => c.ownedInCollection > 0).length / section.cards.length * 100)}%)
                        </span>
                      ) : (
                        <>
                          {/* Right: Completion Stats + Section Prices */}
                          <div className="flex items-center gap-4 flex-wrap justify-between md:justify-end text-xs">
                            {/* Completion metric & mini progress bar */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 sm:w-24">
                                <Progress
                                  value={section.completionPercentage}
                                  indicatorClassName={
                                    isSectionComplete
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                      : "bg-primary"
                                  }
                                  className="h-2 bg-accent"
                                />
                              </div>
                              <span
                                className={`font-mono font-semibold ${
                                  isSectionComplete
                                    ? "text-emerald-400"
                                    : "text-primary"
                                }`}
                              >
                                {section.completionTotalCards > 0
                                  ? `${section.ownedCards}/${section.completionTotalCards} (${section.completionPercentage}%)`
                                  : `${section.totalCardsCount} básicas (100%)`}
                              </span>
                            </div>


                          </div>
                        </>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono" aria-label={`Valor de ${section.label}`}>
                        {priceSummary ? <>
                          <span className="text-primary">{readOnly ? "Total alternativas" : "Total"}: {section.sectionTotalPrice.toFixed(2)} {section.currencySymbol}</span>
                          <span className="text-emerald-400">En colección: {section.sectionOwnedPrice.toFixed(2)} {section.currencySymbol}</span>
                          <span className="text-rose-400">Faltante: {section.sectionMissingPrice.toFixed(2)} {section.currencySymbol}</span>
                          {section.unpricedCards > 0 && <span className="text-muted-foreground">Parcial · {section.unpricedCards} sin precio</span>}
                        </> : <span className="text-muted-foreground">Precios no disponibles</span>}
                      </div>
                    </button>

                    {/* Section Body */}
                    {!isCollapsed && (
                      <div className="divide-y divide-border">
                        {section.cards.map((card) => renderCardRow(card))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card ">
              <div className="divide-y divide-border">
                {sortedCards.map((card) => renderCardRow(card))}
              </div>
            </div>
          )}

          {/* Floating Action Button for Sorting and Grouping */}
          {filteredCards.length > 0 && (
            <FloatingDeckControls
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(f, d) => {
                setSortField(f);
                setSortDirection(d);
              }}
              showStatusOption={true}
              showEdhrecOptions={readOnly}
              isGroupedByType={isGroupedByType}
              onGroupingToggle={setIsGroupedByType}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              hasSections={groupedSections.length > 1}
              totalCards={filteredCards.length}
            />
          )}
        </>
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
          ownedInCollection={selectedCardForDetail.ownedInCollection}
          missingCount={selectedCardForDetail.missingCount}
          assignedQuantity={selectedCardForDetail.assignedQuantity}
          requestedInDecks={selectedCardForDetail.requestedInDecks}
          requestedInDecksCount={selectedCardForDetail.requestedInDecksCount}
          deckId={readOnly ? undefined : initialDeck.id}
          deckCardId={
            readOnly
              ? undefined
              : selectedCardForDetail.deckCardId || selectedCardForDetail.id
          }
          isCommander={
            selectedCardForDetail.isCommander ||
            selectedCardForDetail.cardName?.toLowerCase() ===
              deckInfo.commander?.toLowerCase()
          }
          onVersionSelect={readOnly ? undefined : handleVersionSelect}
        />
      )}

      {!readOnly && (
        <>
          <ConfirmDeleteDeckDialog
            open={showDeleteDeckDialog}
            onOpenChange={setShowDeleteDeckDialog}
            deckId={initialDeck.id}
            deckName={deckInfo.name}
            onConfirm={handleConfirmDeleteDeck}
          />
        </>
      )}
    </div>
  );
}
