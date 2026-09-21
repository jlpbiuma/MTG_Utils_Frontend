"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { CardImage as Image } from "@/components/card-image";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Crown,
  ExternalLink,
  Flame,
  ArrowUpDown,
  Check,
  Heart,
  Eye,
  RefreshCw,
  Compass,
  ArrowUp,
  Filter,
  Users,
  Zap,
  BookOpen,
  Box,
  Wand2,
  Mountain,
  Swords,
  Layers,
  Trash2,
  Undo2,
  BookmarkCheck,
  Minus,
  CircleOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { PriceBadge } from "@/components/price-badge";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import {
  EdhrecCardRecommendation,
  DeckCardWithOwnership,
  DeckRequirement,
} from "@/lib/schemas";
import {
  getDeckRecommendations,
  DeckRecommendationsResult,
} from "@/actions/edhrec";
import {
  addCardToDeck,
  removeCardFromDeck,
  unassignCardFromDeck,
  removeCardFromDeckByName,
  unassignCardFromDeckByName,
  setDeckCommander,
} from "@/actions/decks";
import {
  deleteCardFromCollectionByName,
  decrementCardInCollectionByName,
} from "@/actions/collection";
import {
  toEdhrecSlug,
  groupRecommendationsByCategory,
  sortEdhrecCards,
  getCategoryLabel,
  getCardOwnershipCategory,
  type EdhrecSortOption,
} from "@/lib/edhrec";
import { addOrIncrementWant } from "@/actions/wants";
import { PriceProvider, PriceSummary } from "@/lib/pricing";
import { normalizeCardName } from "@/lib/card-utils";
import { PriceFilter } from "@/components/price-filter";
import { matchesPriceFilter } from "@/lib/sorting";

interface EdhrecRecommendationsProps {
  deckId: string;
  deckName?: string;
  commander: string | null;
  commanderImageUri?: string | null;
  deckCards: DeckCardWithOwnership[];
  onCardAdded?: (cardName: string) => void;
  onCardRemoved?: (cardName: string) => void;
  onCommanderUpdated?: (commanderName: string, imageUri?: string) => void;
}

type OwnershipFilter = "all" | "missing" | "collection" | "deck";

/**
 * Returns a distinct MTG card type icon for each EDHREC category.
 */
function getCategoryIcon(category: string) {
  const cat = category.toLowerCase().trim();
  if (/synergy/i.test(cat)) return <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  if (/top cards|game changers/i.test(cat)) return <Sparkles className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
  if (/new cards/i.test(cat)) return <Sparkles className="h-3.5 w-3.5 text-sky-400 shrink-0" />;
  if (/creature/i.test(cat)) return <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  if (/instant/i.test(cat)) return <Zap className="h-3.5 w-3.5 text-sky-400 shrink-0" />;
  if (/sorcer/i.test(cat)) return <BookOpen className="h-3.5 w-3.5 text-violet-400 shrink-0" />;
  if (/artifact/i.test(cat)) return <Box className="h-3.5 w-3.5 text-amber-300 shrink-0" />;
  if (/enchant/i.test(cat)) return <Wand2 className="h-3.5 w-3.5 text-pink-400 shrink-0" />;
  if (/planeswalker/i.test(cat)) return <Crown className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
  if (/land/i.test(cat)) return <Mountain className="h-3.5 w-3.5 text-lime-400 shrink-0" />;
  if (/battle/i.test(cat)) return <Swords className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  return <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

export function EdhrecRecommendations({
  deckId,
  deckName,
  commander: initialCommander,
  commanderImageUri: initialCommanderImageUri,
  deckCards,
  onCardAdded,
  onCardRemoved,
  onCommanderUpdated,
}: EdhrecRecommendationsProps) {
  const [commander, setCommander] = useState<string | null>(initialCommander);
  const [commanderImageUri, setCommanderImageUri] = useState<string | null>(
    initialCommanderImageUri || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<EdhrecCardRecommendation[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [commanderStats, setCommanderStats] = useState<{
    numDecks?: number;
    colorIdentity?: string[];
  } | null>(null);

  // Filters and controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<EdhrecSortOption>("inclusion");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [groupBySection, setGroupBySection] = useState(true);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // Sticky section tracking
  const [activeSection, setActiveSection] = useState<string>("");
  const sectionPillsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  // Deck details modal for cards present in one or more decks
  const [modalDecks, setModalDecks] = useState<{
    cardName: string;
    decks: DeckRequirement[];
  } | null>(null);

  // Pricing state
  const [priceProvider, setPriceProvider] = useState<PriceProvider>("cardmarket");
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Card detail dialog state
  const [selectedCardForDetail, setSelectedCardForDetail] =
    useState<EdhrecCardRecommendation | null>(null);

  // User actions state
  const [addingCardName, setAddingCardName] = useState<string | null>(null);
  const [removingCardName, setRemovingCardName] = useState<string | null>(null);
  const [unassigningCardName, setUnassigningCardName] = useState<string | null>(null);
  const [deletingCollectionCardName, setDeletingCollectionCardName] = useState<string | null>(null);
  const [addedCardsMap, setAddedCardsMap] = useState<Record<string, boolean>>({});
  const [wantingCardName, setWantingCardName] = useState<string | null>(null);
  const [wantedCardsMap, setWantedCardsMap] = useState<Record<string, boolean>>({});

  const [manualCommanderInput, setManualCommanderInput] = useState("");
  const [isSettingCommander, setIsSettingCommander] = useState(false);

  // Load prices for recommendation cards (using exact PricingCard format expected by backend)
  const loadPrices = useCallback(
    async (
      cards: EdhrecCardRecommendation[],
      provider: PriceProvider = priceProvider,
      bypassCache = false
    ) => {
      if (!cards || cards.length === 0) return;
      setIsLoadingPrices(true);
      try {
        const cardsToPrice = cards.map((c) => ({
          name: c.name,
          scryfallId: c.id,
          quantity: 1,
        }));
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: cardsToPrice,
            provider,
            bypassCache,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.summary) {
            setPriceSummary(json.summary);
          }
        }
      } catch (err) {
        console.error("Failed to load recommendation prices:", err);
      } finally {
        setIsLoadingPrices(false);
      }
    },
    [priceProvider]
  );

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: DeckRecommendationsResult = await getDeckRecommendations(deckId);
      if (res.error) {
        setError(res.error);
      }
      if (res.commander) {
        setCommander(res.commander.name);
        if (res.commander.imageUri) {
          setCommanderImageUri(res.commander.imageUri);
        }
        setCommanderStats({
          numDecks: res.commander.numDecks,
          colorIdentity: res.commander.colorIdentity,
        });
      }
      setCategories(res.categories || []);
      const recs = res.recommendations || [];
      setRecommendations(recs);

      const wantsMap: Record<string, boolean> = {};
      for (const r of recs) {
        if (r.isInWant) {
          wantsMap[r.normalizedName] = true;
        }
      }
      setWantedCardsMap((prev) => ({ ...prev, ...wantsMap }));

      // Load prices in background
      if (recs.length > 0) {
        loadPrices(recs, priceProvider);
      }
    } catch (err) {
      console.error("Failed to load EDHREC recommendations:", err);
      setError("No se pudieron cargar las recomendaciones de EDHREC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [deckId, initialCommander]);

  const handleProviderChange = (newProvider: PriceProvider) => {
    setPriceProvider(newProvider);
    if (recommendations.length > 0) {
      loadPrices(recommendations, newProvider, false);
    }
  };

  const handleRefreshPrices = () => {
    if (recommendations.length > 0) {
      loadPrices(recommendations, priceProvider, true);
    }
  };

  const handleAssignCommander = async (
    name: string,
    scryfallId?: string,
    imageUri?: string
  ) => {
    if (!name.trim()) return;
    setIsSettingCommander(true);
    try {
      await setDeckCommander(deckId, name.trim(), scryfallId, imageUri);
      setCommander(name.trim());
      if (imageUri) setCommanderImageUri(imageUri);
      onCommanderUpdated?.(name.trim(), imageUri);
      await loadRecommendations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al asignar comandante");
    } finally {
      setIsSettingCommander(false);
    }
  };

  const handleAddCard = async (card: EdhrecCardRecommendation) => {
    setAddingCardName(card.name);
    try {
      await addCardToDeck(deckId, {
        cardScryfallId: card.id,
        cardName: card.name,
        quantity: 1,
        isSideboard: false,
        imageUri: card.imageUri || undefined,
      });

      setAddedCardsMap((prev) => ({
        ...prev,
        [card.normalizedName]: true,
      }));

      setRecommendations((prev) =>
        prev.map((r) =>
          r.normalizedName === card.normalizedName ? { ...r, isInDeck: true } : r
        )
      );

      onCardAdded?.(card.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al añadir la carta al mazo");
    } finally {
      setAddingCardName(null);
    }
  };

  const handleAddToWants = async (card: EdhrecCardRecommendation) => {
    if (card.isInCollection) {
      alert(`Ya tienes «${card.name}» en la colección. No se puede añadir a wants.`);
      return;
    }
    setWantingCardName(card.name);
    try {
      await addOrIncrementWant({
        cardScryfallId: card.id,
        cardName: card.name,
        quantity: 1,
        imageUri: card.imageUri || undefined,
      });
      setWantedCardsMap((prev) => ({
        ...prev,
        [card.normalizedName]: true,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al añadir a wants");
    } finally {
      setWantingCardName(null);
    }
  };

  const handleRemoveCardFromDeck = async (card: EdhrecCardRecommendation) => {
    const matchingDeckCard = deckCards.find(
      (dc) => normalizeCardName(dc.cardName) === card.normalizedName
    );
    setRemovingCardName(card.name);
    try {
      if (matchingDeckCard) {
        await removeCardFromDeck(matchingDeckCard.id);
      } else {
        await removeCardFromDeckByName(deckId, card.name);
      }

      setAddedCardsMap((prev) => {
        const next = { ...prev };
        delete next[card.normalizedName];
        return next;
      });

      setRecommendations((prev) =>
        prev.map((r) =>
          r.normalizedName === card.normalizedName ? { ...r, isInDeck: false } : r
        )
      );

      onCardRemoved?.(card.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al quitar la carta del mazo");
    } finally {
      setRemovingCardName(null);
    }
  };

  const handleUnassignCardFromDeck = async (card: EdhrecCardRecommendation) => {
    const matchingDeckCard = deckCards.find(
      (dc) => normalizeCardName(dc.cardName) === card.normalizedName
    );
    setUnassigningCardName(card.name);
    try {
      if (matchingDeckCard && matchingDeckCard.assignedQuantity > 0) {
        await unassignCardFromDeck(matchingDeckCard.id, 1);
      } else if (matchingDeckCard) {
        await removeCardFromDeck(matchingDeckCard.id);
        setAddedCardsMap((prev) => {
          const next = { ...prev };
          delete next[card.normalizedName];
          return next;
        });
        setRecommendations((prev) =>
          prev.map((r) =>
            r.normalizedName === card.normalizedName ? { ...r, isInDeck: false } : r
          )
        );
      } else {
        await unassignCardFromDeckByName(deckId, card.name);
      }

      onCardRemoved?.(card.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al desasignar la carta del mazo");
    } finally {
      setUnassigningCardName(null);
    }
  };

  const handleDeleteFromCollection = async (card: EdhrecCardRecommendation) => {
    if (!confirm(`¿Eliminar «${card.name}» de tu colección física?`)) {
      return;
    }
    setDeletingCollectionCardName(card.name);
    try {
      await deleteCardFromCollectionByName(card.name);

      setRecommendations((prev) =>
        prev.map((r) =>
          r.normalizedName === card.normalizedName
            ? { ...r, isInCollection: false, collectionQuantity: 0 }
            : r
        )
      );
      onCardRemoved?.(card.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar la carta de la colección");
    } finally {
      setDeletingCollectionCardName(null);
    }
  };

  // Ownership counts calculation
  // 3 distinct states:
  // 1. En mazo: Dentro del mazo actual Y dentro de la colección
  // 2. En colección: Fuera del mazo actual Y dentro de la colección
  // 3. Faltante: Fuera del mazo y fuera de la colección (o pedida en mazo pero no en colección)
  const counts = useMemo(() => {
    let inDeck = 0;
    let inCollection = 0;
    let missing = 0;

    for (const card of recommendations) {
      const isCardInDeck = card.isInDeck || addedCardsMap[card.normalizedName];
      const isPhysicallyOwned = !!card.isInCollection && (card.collectionQuantity ?? 0) > 0;
      if (isCardInDeck && isPhysicallyOwned) {
        inDeck++;
      } else if (isPhysicallyOwned && !isCardInDeck) {
        inCollection++;
      } else {
        missing++;
      }
    }
    return {
      total: recommendations.length,
      inDeck,
      inCollection,
      missing,
    };
  }, [recommendations, addedCardsMap]);

  // Filter recommendations based on search and the 3 distinct ownership states
  const filteredCards = useMemo(() => {
    return recommendations.filter((card) => {
      const isCardInDeck = card.isInDeck || addedCardsMap[card.normalizedName];
      const isPhysicallyOwned = !!card.isInCollection && (card.collectionQuantity ?? 0) > 0;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesCategory =
          card.category.toLowerCase().includes(query) ||
          (card.categories || []).some((c) => c.toLowerCase().includes(query));
        if (!matchesName && !matchesCategory) return false;
      }

      // Ownership filter:
      // "deck": dentro del mazo y dentro de la colección
      // "collection": fuera del mazo y dentro de la colección
      // "missing": fuera del mazo y fuera de la colección
      if (ownershipFilter === "deck") {
        return isCardInDeck && isPhysicallyOwned;
      }
      if (ownershipFilter === "collection") {
        return isPhysicallyOwned && !isCardInDeck;
      }
      if (ownershipFilter === "missing") {
        return !isPhysicallyOwned;
      }

      // Price filter
      const parsedMin = minPrice.trim() !== "" ? parseFloat(minPrice) : null;
      const parsedMax = maxPrice.trim() !== "" ? parseFloat(maxPrice) : null;
      if (!matchesPriceFilter(card.name, card.id, parsedMin, parsedMax, priceSummary?.quotes)) {
        return false;
      }

      return true; // "all"
    });
  }, [recommendations, searchQuery, ownershipFilter, addedCardsMap, minPrice, maxPrice, priceSummary]);

  // Ensure "High Synergy Cards" is placed right at the beginning of category order
  const orderedCategories = useMemo(() => {
    const priority = [
      "High Synergy Cards",
      "Top Cards",
      "New Cards",
      "Game Changers",
      "Creatures",
      "Instants",
      "Sorceries",
      "Utility Artifacts",
      "Enchantments",
      "Planeswalkers",
      "Utility Lands",
      "Mana Artifacts",
      "Lands",
    ];
    return Array.from(new Set([...priority, ...categories]));
  }, [categories]);

  // Helper to get all decks where a card is present, including current deck
  const getCardDecks = useCallback(
    (card: EdhrecCardRecommendation): DeckRequirement[] => {
      const existing = [...(card.requestedInDecks || [])];
      const isLocallyAdded = !!addedCardsMap[card.normalizedName];
      const isServerInDeck = card.isInDeck;

      if ((isLocallyAdded || isServerInDeck) && !existing.some((d) => d.deckId === deckId)) {
        existing.unshift({
          deckId,
          deckName: deckName || "Este mazo",
          quantity: 1,
        });
      }
      return existing;
    },
    [addedCardsMap, deckId, deckName]
  );

  // Price lookup map for instant sorting by price (CardPriceQuote uses unitPrice.trend or subtotal)
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!priceSummary?.quotes) return map;
    for (const [key, quote] of Object.entries(priceSummary.quotes)) {
      const priceVal = quote?.unitPrice?.trend ?? quote?.subtotal ?? 0;
      if (priceVal > 0) {
        map[key] = priceVal;
        if (quote?.cardName) {
          map[normalizeCardName(quote.cardName)] = priceVal;
        }
        if (quote?.scryfallId) {
          map[quote.scryfallId] = priceVal;
        }
      }
    }
    return map;
  }, [priceSummary]);

  // Enrich cards with accurate requested decks counts for sorting and filtering
  const enrichedFilteredCards = useMemo(() => {
    return filteredCards.map((card) => {
      const decks = getCardDecks(card);
      return {
        ...card,
        requestedInDecks: decks,
        requestedInDecksCount: decks.length,
      };
    });
  }, [filteredCards, getCardDecks]);

  const groupedSections = useMemo(
    () => groupRecommendationsByCategory(enrichedFilteredCards, orderedCategories, sortBy, priceMap),
    [enrichedFilteredCards, orderedCategories, sortBy, priceMap]
  );

  const flatSortedCards = useMemo(
    () => sortEdhrecCards(enrichedFilteredCards, sortBy, priceMap),
    [enrichedFilteredCards, sortBy, priceMap]
  );

  // Jump to section handler with smooth scroll and offset for top navbar
  const handleJumpToSection = (categoryName: string) => {
    setActiveSection(categoryName);
    const slug = toEdhrecSlug(categoryName);
    const element = document.getElementById(`section-${slug}`);
    if (element) {
      const headerOffset = 70; // 56px navbar + margin
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
    }
  };

  // Scroll spy to highlight current section in sticky menu as user scrolls
  useEffect(() => {
    if (groupedSections.length === 0) return;

    const handleScroll = () => {
      const threshold = 100;
      for (const sec of groupedSections) {
        const slug = toEdhrecSlug(sec.category);
        const el = document.getElementById(`section-${slug}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold && rect.bottom > threshold) {
            setActiveSection(sec.category);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [groupedSections]);

  // Keep active pill scrolled into view in sticky menu
  useEffect(() => {
    if (activeSection && sectionPillsRef.current[activeSection]) {
      sectionPillsRef.current[activeSection]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeSection]);

  const candidateCommanders = useMemo(() => {
    return deckCards.filter(
      (c) =>
        c.typeLine?.toLowerCase().includes("legendary") ||
        c.typeLine?.toLowerCase().includes("creature")
    );
  }, [deckCards]);

  if (!commander && !loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
          <Crown className="w-8 h-8" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-2xl font-semibold text-foreground">
            Elige un Comandante para tu Mazo
          </h3>
          <p className="text-sm text-muted-foreground">
            Para consultar las recomendaciones oficiales de la comunidad de EDHREC, es imprescindible que el mazo cuente con un comandante asignado.
          </p>
        </div>

        {candidateCommanders.length > 0 && (
          <div className="space-y-3 max-w-xl mx-auto pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left">
              Cartas legendarias o criaturas en este mazo:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {candidateCommanders.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri} size="lg">
                      <span className="font-semibold text-sm text-foreground truncate cursor-pointer hover:text-primary">
                        {card.cardName}
                      </span>
                    </CardPreviewHover>
                  </div>
                  <Button
                    size="sm"
                    variant="mana"
                    className="shrink-0 text-xs h-7 gap-1"
                    disabled={isSettingCommander}
                    onClick={() =>
                      handleAssignCommander(
                        card.cardName,
                        card.cardScryfallId,
                        card.imageUri || undefined
                      )
                    }
                  >
                    <Crown className="w-3 h-3 text-primary" />
                    Elegir
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border max-w-md mx-auto space-y-3">
          <p className="text-xs text-muted-foreground">
            O escribe el nombre exacto de cualquier comandante (en inglés):
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="ej: Aragorn, the Uniter"
              value={manualCommanderInput}
              onChange={(e) => setManualCommanderInput(e.target.value)}
              className="border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAssignCommander(manualCommanderInput);
                }
              }}
            />
            <Button
              variant="mana"
              disabled={isSettingCommander || !manualCommanderInput.trim()}
              onClick={() => handleAssignCommander(manualCommanderInput)}
            >
              {isSettingCommander ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderCard = (card: EdhrecCardRecommendation) => {
    const isCardInDeck = !!(card.isInDeck || addedCardsMap[card.normalizedName]);
    const isAdding = addingCardName === card.name;
    const isRemoving = removingCardName === card.name;
    const isUnassigning = unassigningCardName === card.name;
    const isDeletingCollection = deletingCollectionCardName === card.name;
    const isWanted = wantedCardsMap[card.normalizedName];
    const isWanting = wantingCardName === card.name;
    const cardDecks = getCardDecks(card);

    // Retrieve price quote for this recommendation (keyed by scryfall ID or normalized name)
    const quote =
      priceSummary?.quotes[card.id] ||
      priceSummary?.quotes[normalizeCardName(card.name)];

    const isHighSynergy =
      card.categories?.some((c) => /synergy/i.test(c)) ||
      card.category.toLowerCase().includes("synergy") ||
      card.synergy >= 15;

    // Precise 3-state classification:
    // 1. En mazo (dentro del mazo y dentro de la colección)
    // 2. En colección (fuera del mazo y dentro de la colección)
    // 3. Faltante (fuera del mazo y fuera de la colección, indicando si se pide en mazo)
    const ownership = getCardOwnershipCategory(
      card,
      isCardInDeck,
      deckId,
      deckName
    );

    // Matching deck card (if present in deckCards prop)
    const matchingDeckCard = deckCards.find(
      (dc) => normalizeCardName(dc.cardName) === card.normalizedName
    );

    return (
      <div
        key={`${card.id}-${card.name}-${card.category}`}
        className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
          ownership.category === "in-deck"
            ? "bg-card/70 border-emerald-500/50 shadow-sm"
            : ownership.category === "in-collection"
            ? "bg-card border-sky-500/40 hover:border-sky-400"
            : isHighSynergy
            ? "bg-card border-amber-500/40 hover:border-amber-400 shadow-sm"
            : "bg-card border-border hover:border-primary/40"
        }`}
      >
        <div className="space-y-3">
          {/* Header row: category + inclusion + price badge */}
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-mono uppercase tracking-wider truncate max-w-[130px] ${
                isHighSynergy
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {getCategoryLabel(card.category)}
            </Badge>

            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="flex items-center gap-1 font-mono font-semibold text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-primary shrink-0"
                title={`${card.numDecks.toLocaleString()} de ${card.potentialDecks.toLocaleString()} mazos registrados en EDHREC`}
              >
                <span>{card.inclusionPct}%</span>
              </div>

              {/* Price badge displayed prominently without entering card details */}
              <PriceBadge quote={quote} showSubtotal={false} />
            </div>
          </div>

          {/* Visual Card Showcase - Gran tamaño para distinguir la carta perfectamente */}
          <div className="space-y-3">
            {/* Full MTG Card Image */}
            <div
              onClick={() => setSelectedCardForDetail(card)}
              className="relative cursor-pointer group/img w-full flex justify-center pt-0.5"
              title="Clic para ver detalles completos en español"
            >
              <div
                className="relative w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-border/80 group-hover/img:border-primary shadow-md group-hover/img:shadow-2xl group-hover/img:scale-[1.02] transition-all duration-200 bg-secondary/30"
                style={{ aspectRatio: "63 / 88" }}
              >
                {card.imageUri ? (
                  <Image
                    src={card.imageUri}
                    alt={card.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                    className="object-cover rounded-lg"
                    priority={false}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                    <Layers className="w-10 h-10 text-muted-foreground/40" />
                    <span className="text-xs font-semibold">{card.name}</span>
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
                title={card.name}
              >
                {card.name}
              </h4>

              <div className="flex flex-wrap items-center gap-1.5">
                {card.synergy !== 0 && (
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                      card.synergy > 0
                        ? "text-amber-300 bg-amber-950/40 border border-amber-800/40"
                        : "text-muted-foreground bg-secondary"
                    }`}
                  >
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>
                      {card.synergy > 0 ? `+${card.synergy}%` : `${card.synergy}%`} sinergia
                    </span>
                  </div>
                )}

                {/* Explicit deck membership / request indicator */}
                {cardDecks.length > 0 && (
                  <div className="pt-0.5 w-full">
                    {card.isInCollection && (card.collectionQuantity ?? 0) > 0 ? (
                      /* Physically owned in collection */
                      cardDecks.length === 1 ? (
                        cardDecks[0].deckId === deckId ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40 truncate max-w-full">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="truncate">
                              En este mazo:{" "}
                              <strong className="text-emerald-300 font-semibold">
                                {cardDecks[0].deckName}
                              </strong>
                            </span>
                          </span>
                        ) : (
                          <Link
                            href={`/decks/${cardDecks[0].deckId}`}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-medium bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-800/40 transition-colors truncate max-w-full group/deck"
                            title={`Ir al mazo "${cardDecks[0].deckName}"`}
                          >
                            <Layers className="h-3 w-3 text-indigo-400 shrink-0" />
                            <span className="truncate">
                              En mazo:{" "}
                              <strong className="text-indigo-200 font-semibold group-hover/deck:underline">
                                {cardDecks[0].deckName}
                              </strong>
                            </span>
                          </Link>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalDecks({ cardName: card.name, decks: cardDecks });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-300 font-medium bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-800/40 transition-colors cursor-pointer truncate max-w-full text-left"
                          title="Ver todos los mazos donde está esta carta"
                        >
                          <Layers className="h-3 w-3 text-indigo-400 shrink-0" />
                          <span className="truncate">
                            En {cardDecks.length} mazos:{" "}
                            <strong className="text-indigo-200 font-semibold">
                              {cardDecks[0].deckName} (+{cardDecks.length - 1})
                            </strong>
                          </span>
                        </button>
                      )
                    ) : (
                      /* NOT in collection: marked strictly as "Se pide", not "En mazo" */
                      cardDecks.length === 1 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-800/40 truncate max-w-full" title="Se pide en la lista del mazo, faltante en tu colección física">
                          <BookmarkCheck className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="truncate">
                            Se pide en:{" "}
                            <strong className="text-amber-200 font-semibold">
                              {cardDecks[0].deckName}
                            </strong>
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalDecks({ cardName: card.name, decks: cardDecks });
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-950/40 hover:bg-amber-900/60 px-2 py-0.5 rounded-md border border-amber-800/40 transition-colors cursor-pointer truncate max-w-full text-left"
                          title="Ver todos los mazos donde se pide esta carta (faltante en tu colección física)"
                        >
                          <BookmarkCheck className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="truncate">
                            Se pide en {cardDecks.length} mazos:{" "}
                            <strong className="text-amber-200 font-semibold">
                              {cardDecks[0].deckName} (+{cardDecks.length - 1})
                            </strong>
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inclusion bar */}
          <div className="space-y-1">
            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, card.inclusionPct))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md border ${ownership.badgeClass}`}
              title={ownership.sublabel}
            >
              {ownership.category === "in-deck" && (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              )}
              {ownership.category === "in-collection" && (
                <Sparkles className="h-3 w-3 text-sky-400" />
              )}
              {ownership.category === "missing" && ownership.isRequested && (
                <BookmarkCheck className="h-3 w-3 text-amber-400" />
              )}
              {ownership.category === "missing" && !ownership.isRequested && (
                <CircleOff className="h-3 w-3 text-rose-400" />
              )}
              <span>{ownership.label}</span>
            </span>
            <span className="text-[10px] text-muted-foreground/80 pl-0.5">
              {ownership.sublabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedCardForDetail(card)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              title="Ver detalles completos en español"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Detalles</span>
            </Button>

            {/* Quitar/Eliminar de colección física */}
            {card.isInCollection && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isDeletingCollection}
                onClick={() => handleDeleteFromCollection(card)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-950/40 gap-1"
                title="Eliminar de la colección física"
              >
                {isDeletingCollection ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-400" />
                )}
                <span className="hidden md:inline text-[11px]">Quitar de col.</span>
              </Button>
            )}

            {/* Want button if not owned in collection */}
            {!card.isInCollection && (
              <Button
                size="sm"
                variant={isWanted ? "ghost" : "outline"}
                disabled={isWanting || isWanted}
                onClick={() => handleAddToWants(card)}
                className="h-8 px-2.5 text-xs gap-1"
                title="Añadir a lista de wants"
              >
                {isWanting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Heart
                    className={`h-3.5 w-3.5 ${isWanted ? "fill-rose-400 text-rose-400" : ""}`}
                  />
                )}
                {isWanted ? "En wants" : "Want"}
              </Button>
            )}

            {/* Deck buttons: Desasignar / Quitar del mazo OR Añadir al mazo */}
            {isCardInDeck ? (
              <div className="flex items-center gap-1">
                {matchingDeckCard && matchingDeckCard.assignedQuantity > 0 ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUnassigning}
                      onClick={() => handleUnassignCardFromDeck(card)}
                      className="h-8 px-2.5 text-xs font-semibold text-amber-300 border-amber-700/60 hover:bg-amber-950/40 gap-1"
                      title="Liberar 1 asignación física del mazo de vuelta a la colección"
                    >
                      {isUnassigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                      )}
                      Desasignar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isRemoving}
                      onClick={() => handleRemoveCardFromDeck(card)}
                      className="h-8 px-2 text-xs text-rose-400 hover:bg-rose-950/40 gap-1"
                      title="Quitar carta del mazo por completo"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRemoving}
                    onClick={() => handleRemoveCardFromDeck(card)}
                    className="h-8 px-2.5 text-xs font-semibold text-rose-400 border-rose-800/50 hover:bg-rose-950/40 gap-1"
                    title="Desasignar / Quitar del mazo"
                  >
                    {isRemoving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Desasignar del mazo
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                variant={card.isInCollection ? "mana" : "outline"}
                disabled={isAdding}
                onClick={() => handleAddCard(card)}
                className={`h-8 px-3 text-xs gap-1 font-semibold ${
                  card.isInCollection
                    ? ""
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                }`}
                title="Añadir esta carta al mazo"
              >
                {isAdding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Añadir
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Commander Hero Banner */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            {commander && (
              <CardPreviewHover cardName={commander} imageUri={commanderImageUri} size="lg">
                {commanderImageUri ? (
                  <Image
                    src={commanderImageUri}
                    alt={commander}
                    width={80}
                    height={112}
                    sizes="80px"
                    className="w-16 h-22 sm:w-20 sm:h-28 object-cover rounded-lg border-2 border-primary/60 shrink-0 cursor-pointer hover:border-primary transition-all hover:scale-105"
                  />
                ) : (
                  <div className="w-16 h-22 sm:w-20 sm:h-28 rounded-lg bg-secondary border-2 border-primary/40 flex items-center justify-center text-primary shrink-0">
                    <Crown className="w-8 h-8" />
                  </div>
                )}
              </CardPreviewHover>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs"
                >
                  <Crown className="h-3 w-3 text-primary" />
                  Comandante
                </Badge>

                {commanderStats?.numDecks ? (
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs"
                  >
                    {commanderStats.numDecks.toLocaleString()} mazos en EDHREC
                  </Badge>
                ) : null}
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight truncate">
                {commander}
              </h2>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Recomendaciones basadas en datos colectivos de la comunidad
                </span>
                {commander && (
                  <a
                    href={`https://edhrec.com/commanders/${toEdhrecSlug(commander)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline font-medium"
                  >
                    Ver en EDHREC
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-border">
            <div className="text-center px-3 py-2 bg-secondary rounded-lg border border-border">
              <div className="text-xs text-muted-foreground">Sugerencias</div>
              <div className="text-lg font-mono font-semibold text-foreground">
                {counts.total}
              </div>
            </div>

            <div className="text-center px-3 py-2 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
              <div className="text-xs text-emerald-400">En Mazo</div>
              <div className="text-lg font-mono font-bold text-emerald-300">
                {counts.inDeck}
              </div>
            </div>

            <div className="text-center px-3 py-2 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
              <div className="text-xs text-emerald-400">En Colección</div>
              <div className="text-lg font-mono font-semibold text-emerald-300">
                {counts.inCollection}
              </div>
            </div>

            <div className="text-center px-3 py-2 bg-secondary rounded-lg border border-border">
              <div className="text-xs text-muted-foreground">Faltantes</div>
              <div className="text-lg font-mono font-semibold text-rose-400">
                {counts.missing}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ownership Filter Bar (Similar al del mazo) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-1.5 bg-secondary/40 rounded-xl border border-border">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 shrink-0 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filtrar:
          </span>

          <button
            onClick={() => setOwnershipFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              ownershipFilter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <span>Todas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => setOwnershipFilter("collection")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              ownershipFilter === "collection"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-sky-300 hover:bg-sky-950/20"
            }`}
            title="Cartas fuera del mazo y dentro de la colección"
          >
            <Sparkles className="h-3 w-3" />
            <span>En colección</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {counts.inCollection}
            </span>
          </button>

          <button
            onClick={() => setOwnershipFilter("deck")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
              ownershipFilter === "deck"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-emerald-300 hover:bg-emerald-950/20"
            }`}
            title="Cartas dentro del mazo y dentro de la colección"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>En mazo</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20">
              {counts.inDeck}
            </span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Sort, Pricing provider, View mode */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cartas recomendadas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as EdhrecSortOption)}
              className="h-9 px-3 rounded-md bg-background border border-border text-xs text-foreground font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="inclusion">% Inclusión (EDHREC)</option>
              <option value="synergy">Mayor Sinergia (+)</option>
              <option value="requested_decks">Mazos donde se pide (Mayor a menor)</option>
              <option value="price_desc">Precio (Mayor a menor)</option>
              <option value="price_asc">Precio (Menor a mayor)</option>
              <option value="name">Nombre (A-Z)</option>
            </select>
          </div>

          {/* Price provider selector */}
          <div className="flex items-center gap-1">
            <select
              value={priceProvider}
              onChange={(e) => handleProviderChange(e.target.value as PriceProvider)}
              className="h-9 px-2 rounded-md bg-background border border-border text-xs text-foreground font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Proveedor de precios para el listado"
            >
              <option value="cardmarket">Cardmarket (€)</option>
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshPrices}
              disabled={isLoadingPrices}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              title="Actualizar precios del listado"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingPrices ? "animate-spin text-primary" : ""}`}
              />
            </Button>
          </div>

          {/* Price filter min/max */}
          <PriceFilter
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
            currencySymbol={priceSummary?.currencySymbol || "€"}
          />

          {/* Grouping by section toggle */}
          <Button
            type="button"
            size="sm"
            variant={groupBySection ? "secondary" : "outline"}
            onClick={() => setGroupBySection((prev) => !prev)}
            className="h-9 px-3 text-xs font-medium gap-1.5 border-border"
            title={
              groupBySection
                ? "Desactivar agrupación por secciones para ver todas las cartas en lista continua"
                : "Agrupar cartas por categorías de EDHREC"
            }
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">
              {groupBySection ? "Agrupado por secciones" : "Sin agrupar (continuo)"}
            </span>
            <span className="sm:hidden">
              {groupBySection ? "Agrupado" : "Continuo"}
            </span>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-16 space-y-4 rounded-lg bg-card border border-border">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Consultando recomendaciones de la comunidad en EDHREC...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            Aviso de EDHREC
          </div>
          <p className="text-sm text-rose-300/90">{error}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={loadRecommendations}
            className="mt-2 text-xs border-rose-800 hover:bg-rose-900/50"
          >
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && enrichedFilteredCards.length === 0 && (
        <div className="p-12 text-center rounded-lg bg-card border border-border space-y-3">
          <Sparkles className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">
            {recommendations.length === 0
              ? "No se encontraron recomendaciones en EDHREC para este comandante"
              : "No se encontraron cartas con la búsqueda o filtros actuales"}
          </p>
          {(searchQuery || ownershipFilter !== "all" || minPrice || maxPrice) && (
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {searchQuery && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="text-xs"
                >
                  Limpiar búsqueda
                </Button>
              )}
              {ownershipFilter !== "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOwnershipFilter("all")}
                  className="text-xs"
                >
                  Ver todas
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
        </div>
      )}

      {!loading && enrichedFilteredCards.length > 0 && (
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6 relative w-full">
          {/* Sticky Left Sidebar Navigation */}
          {groupBySection ? (
            <aside
              aria-label="Navegación de secciones EDHREC"
              className="w-full lg:w-56 xl:w-60 shrink-0 lg:sticky lg:top-16 z-20 space-y-2 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-3 shadow-md lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between px-2 py-1.5 mb-1 border-b border-border/60">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-primary" />
                  Secciones
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {groupedSections.length}
                </span>
              </div>

              {/* List of all categories without numbers (horizontal scroll on small screens, vertical on desktop) */}
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none">
                {groupedSections.map((sec) => {
                  const isActive = activeSection === sec.category;
                  const isHighSynergy = /synergy/i.test(sec.category);

                  return (
                    <button
                      key={sec.category}
                      ref={(el) => {
                        sectionPillsRef.current[sec.category] = el;
                      }}
                      onClick={() => handleJumpToSection(sec.category)}
                      className={`w-auto lg:w-full px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap lg:whitespace-normal transition-all duration-150 flex items-center gap-2.5 text-left shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm scale-[1.01]"
                          : isHighSynergy
                          ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                      }`}
                      title={`Saltar a sección ${getCategoryLabel(sec.category)}`}
                    >
                      {getCategoryIcon(sec.category)}
                      <span className="truncate">{getCategoryLabel(sec.category)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-border/60 mt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl hover:bg-secondary"
                  title="Subir al inicio del mazo"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>Subir al inicio</span>
                </Button>
              </div>
            </aside>
          ) : (
            <aside
              aria-label="Controles de vista continua"
              className="w-full lg:w-56 xl:w-60 shrink-0 lg:sticky lg:top-16 z-20 space-y-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-3 shadow-md"
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  Vista continua
                </span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 space-y-2.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mostrando <strong>{flatSortedCards.length}</strong> cartas recomendadas continuas sin división por categorías.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setGroupBySection(true)}
                  className="w-full text-xs gap-1.5 h-8 font-medium border-border"
                >
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Agrupar por sección
                </Button>
              </div>

              <div className="pt-2 border-t border-border/60">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-full justify-center h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-xl hover:bg-secondary"
                  title="Subir al inicio del mazo"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>Subir al inicio</span>
                </Button>
              </div>
            </aside>
          )}

          {/* Main cards feed */}
          {groupBySection ? (
            <div className="flex-1 min-w-0 space-y-6">
              {groupedSections.map((section) => {
                const isHighSynergySection = /synergy/i.test(section.category);
                const slug = toEdhrecSlug(section.category);

                return (
                  <section
                    id={`section-${slug}`}
                    key={section.category}
                    className={`space-y-3 rounded-xl p-4 transition-colors scroll-mt-20 ${
                      isHighSynergySection
                        ? "bg-amber-950/15 border border-amber-800/30"
                        : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(section.category)}
                        <h3 className="text-lg font-bold text-foreground">
                          {getCategoryLabel(section.category)}
                        </h3>
                        {isHighSynergySection && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30 font-semibold"
                          >
                            EDHREC High Synergy
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {section.cards.length} {section.cards.length === 1 ? "carta" : "cartas"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                          title="Subir al inicio"
                        >
                          <ArrowUp className="h-3 w-3" />
                          <span className="hidden sm:inline">Arriba</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {section.cards.map(renderCard)}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Todas las cartas recomendadas
                  </h3>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {flatSortedCards.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                    title="Subir al inicio"
                  >
                    <ArrowUp className="h-3 w-3" />
                    <span className="hidden sm:inline">Arriba</span>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {flatSortedCards.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Card Detail Dialog for clicked recommendation card */}
      {selectedCardForDetail && (
        <CardDetailDialog
          isOpen={!!selectedCardForDetail}
          onOpenChange={(open) => {
            if (!open) setSelectedCardForDetail(null);
          }}
          cardId={selectedCardForDetail.id}
          cardName={selectedCardForDetail.name}
          imageUri={selectedCardForDetail.imageUri}
          requestedInDecks={selectedCardForDetail.requestedInDecks}
          requestedInDecksCount={selectedCardForDetail.requestedInDecksCount}
          ownedInCollection={selectedCardForDetail.collectionQuantity}
          missingCount={
            selectedCardForDetail.isInDeck ||
            addedCardsMap[selectedCardForDetail.normalizedName]
              ? 0
              : 1
          }
          defaultTab="versions"
        />
      )}

      {/* Modal Dialog showing all decks where a card is present */}
      {modalDecks && (
        <Dialog
          open={!!modalDecks}
          onOpenChange={(open) => {
            if (!open) setModalDecks(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Layers className="h-5 w-5 text-indigo-400" />
                <span>Mazos relacionados con &quot;{modalDecks.cardName}&quot;</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mazos donde esta carta está incluida o solicitada ({modalDecks.decks.length}{" "}
                {modalDecks.decks.length === 1 ? "mazo" : "mazos"}):
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {modalDecks.decks.map((deck) => {
                const isCurrentDeck = deck.deckId === deckId;
                return (
                  <div
                    key={deck.deckId}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                      isCurrentDeck
                        ? "bg-emerald-950/30 border-emerald-800/50"
                        : "bg-secondary/60 hover:bg-secondary border-border"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/decks/${deck.deckId}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline truncate"
                        >
                          {deck.deckName}
                        </Link>
                        {isCurrentDeck && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          >
                            Este mazo
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {deck.colors && deck.colors.length > 0 && (
                          <ColorIdentityPips colors={deck.colors} size="xs" />
                        )}
                        {deck.completionPercentage !== undefined && (
                          <span>{deck.completionPercentage}% completado</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-background border border-border">
                        {deck.quantity}x
                      </span>
                      <Link
                        href={`/decks/${deck.deckId}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background border border-border transition-colors"
                        title="Abrir mazo"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
