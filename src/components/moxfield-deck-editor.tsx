"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Sliders,
  Check,
  Plus,
  Minus,
  Trash2,
  Tag,
  Crown,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  Layers,
  Sparkles,
  Grid,
  List,
  BookmarkPlus,
  Settings2,
  CheckSquare,
  Square,
  X,
  RefreshCw,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ArrowRightLeft,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { CardImage as Image } from "@/components/card-image";
import { CardContextMenu } from "@/components/card-context-menu";
import { DeckTagManagerDialog } from "@/components/deck-tag-manager-dialog";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import type { DeckCardWithOwnership, DeckDetailWithStats } from "@/lib/schemas";
import type { PriceProvider, PriceSummary } from "@/lib/pricing/types";
import { normalizeCardName, getCardCategory } from "@/lib/card-utils";
import { parseManaValue, getCardColorBucket } from "@/lib/deck-analytics";
import { searchCards, ScryfallCardResult } from "@/actions/scryfall";
import {
  addCardToDeck,
  updateDeckCardQuantity,
  updateDeckCardTags,
  updateDeckTags,
  removeCardFromDeck,
  moveCardToSideboard,
} from "@/actions/decks";
import { addDeckMissingToWants } from "@/actions/wants";

interface MoxfieldDeckEditorProps {
  deck: DeckDetailWithStats;
  cards: DeckCardWithOwnership[];
  priceSummary: PriceSummary | null;
  priceProvider: PriceProvider;
  onPriceProviderChange?: (provider: PriceProvider) => void;
  onCardsUpdated: (updater: (prev: DeckCardWithOwnership[]) => DeckCardWithOwnership[]) => void;
  onDeckUpdated?: (updater: (prev: DeckDetailWithStats) => DeckDetailWithStats) => void;
}

export function MoxfieldDeckEditor({
  deck,
  cards,
  priceSummary,
  priceProvider,
  onPriceProviderChange,
  onCardsUpdated,
  onDeckUpdated,
}: MoxfieldDeckEditorProps) {
  // Top toolbar states
  const [viewMode, setViewMode] = useState<"text" | "visual">("text");
  const [grouping, setGrouping] = useState<"tags" | "type_and_tags" | "type" | "mana_value" | "color">("tags");
  const [sortBy, setSortBy] = useState<"name" | "cmc" | "price">("name");

  // Filter states
  const [enableCollection, setEnableCollection] = useState<boolean>(true);
  const [disableTags, setDisableTags] = useState<boolean>(false);
  const [hideDeckTags, setHideDeckTags] = useState<boolean>(false);

  // Card search bar state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScryfallCardResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Active card tag popover state
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    card: DeckCardWithOwnership;
    position: { x: number; y: number };
  } | null>(null);

  // Tag manager dialog state
  const [tagManagerCard, setTagManagerCard] = useState<DeckCardWithOwnership | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);

  // Card detail dialog state
  const [detailCard, setDetailCard] = useState<DeckCardWithOwnership | null>(null);

  // Hovered card for preview on left column
  const [hoveredCard, setHoveredCard] = useState<DeckCardWithOwnership | null>(null);

  // Wishlist / Wants loading
  const [isAddingWants, setIsAddingWants] = useState(false);

  // Available deck tags list
  const availableTags = useMemo(() => {
    const set = new Set<string>(deck.tags || []);
    for (const c of cards) {
      for (const t of c.tags || []) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set);
  }, [deck.tags, cards]);

  // Commander detection & card
  const commanderCard = useMemo(() => {
    return (
      cards.find((c) => c.isCommander && !c.isSideboard) ||
      cards.find((c) => c.cardName.toLowerCase() === (deck.commander || "").toLowerCase() && !c.isSideboard)
    );
  }, [cards, deck.commander]);

  const commanderImage =
    deck.commanderImageUri || commanderCard?.imageUri || "https://cards.scryfall.io/large/front/a/1/a1d95b54-7333-4f9e-a89b-980bf8571fa6.jpg";

  // Helper to format currency
  const formatPrice = (amount: number | null | undefined) => {
    if (amount == null || amount === 0) return "--";
    const symbol = priceSummary?.currencySymbol || "€";
    return `${amount.toFixed(2)} ${symbol}`;
  };

  const getCardPrice = (cardName: string): number => {
    if (!priceSummary?.quotes) return 0;
    const norm = normalizeCardName(cardName);
    const quote = priceSummary.quotes[norm];
    return quote?.unitPrice?.trend ?? 0;
  };

  // Commander price
  const commanderPrice = commanderCard ? getCardPrice(commanderCard.cardName) : 0;

  // Search input debouncer
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchCards(searchQuery.trim(), 1);
        setSearchResults(res.data || []);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error("Scryfall search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle adding card from search
  const handleAddCard = async (scryCard: ScryfallCardResult, isSideboard = false) => {
    const imageUri =
      scryCard.image_uris?.normal ||
      scryCard.card_faces?.[0]?.image_uris?.normal ||
      scryCard.image_uris?.small ||
      null;

    try {
      await addCardToDeck(deck.id, {
        cardScryfallId: scryCard.id,
        cardName: scryCard.name,
        quantity: 1,
        isSideboard,
        manaCost: scryCard.mana_cost || null,
        typeLine: scryCard.type_line || null,
        imageUri,
      });

      const optimisticCard: DeckCardWithOwnership = {
        id: `opt-${Date.now()}`,
        deckId: deck.id,
        cardScryfallId: scryCard.id,
        cardName: scryCard.name,
        quantity: 1,
        assignedQuantity: 0,
        isSideboard,
        manaCost: scryCard.mana_cost || null,
        typeLine: scryCard.type_line || null,
        imageUri,
        setCode: scryCard.set || null,
        ownedInCollection: 0,
        availableToAssign: 0,
        assignedInOtherDecks: [],
        missingCount: 1,
        tags: [],
      };

      onCardsUpdated((prev) => {
        const existing = prev.find(
          (c) => c.cardName.toLowerCase() === scryCard.name.toLowerCase() && c.isSideboard === isSideboard
        );
        if (existing) {
          return prev.map((c) => (c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c));
        }
        return [...prev, optimisticCard];
      });
    } catch (err) {
      console.error("Failed to add card:", err);
    } finally {
      setSearchQuery("");
      setShowSearchDropdown(false);
    }
  };

  // Quantity updates
  const handleQuantityChange = async (card: DeckCardWithOwnership, delta: number) => {
    const newQty = card.quantity + delta;
    if (newQty <= 0) {
      handleRemoveCard(card.id);
      return;
    }

    onCardsUpdated((prev) => prev.map((c) => (c.id === card.id ? { ...c, quantity: newQty } : c)));
    try {
      await updateDeckCardQuantity(card.id, newQty);
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  };

  // Remove card
  const handleRemoveCard = async (cardId: string) => {
    onCardsUpdated((prev) => prev.filter((c) => c.id !== cardId));
    try {
      await removeCardFromDeck(cardId);
    } catch (err) {
      console.error("Failed to remove card:", err);
    }
  };

  // Move card between mainboard and sideboard
  const handleToggleSideboard = async (card: DeckCardWithOwnership) => {
    const nextSideboard = !card.isSideboard;
    try {
      const res = await moveCardToSideboard(card.id, nextSideboard, deck.id);
      if (res.success) {
        onCardsUpdated((prev) => {
          const destExisting = prev.find(
            (c) =>
              c.cardScryfallId === card.cardScryfallId &&
              c.isSideboard === nextSideboard &&
              c.id !== card.id
          );
          if (destExisting) {
            return prev
              .filter((c) => c.id !== card.id)
              .map((c) =>
                c.id === destExisting.id
                  ? { ...c, quantity: c.quantity + card.quantity }
                  : c
              );
          }
          return prev.map((c) =>
            c.id === card.id ? { ...c, isSideboard: nextSideboard } : c
          );
        });
      } else {
        alert(res.error || "Error al mover la carta");
      }
    } catch (err: any) {
      alert(err?.message || "Error al mover la carta");
    }
  };

  // Toggle tag on a card
  const handleToggleCardTag = async (card: DeckCardWithOwnership, tag: string) => {
    const currentTags = card.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onCardsUpdated((prev) => prev.map((c) => (c.id === card.id ? { ...c, tags: newTags } : c)));

    try {
      await updateDeckCardTags(card.id, newTags, deck.id);
    } catch (err) {
      console.error("Failed to update card tags:", err);
    }
  };

  // Create new tag and assign to card
  const handleAddNewTag = async (card: DeckCardWithOwnership) => {
    const cleanTag = newTagInput.trim();
    if (!cleanTag) return;

    setIsSavingTag(true);
    const updatedCardTags = Array.from(new Set([...(card.tags || []), cleanTag]));
    const updatedDeckTags = Array.from(new Set([...availableTags, cleanTag]));

    onCardsUpdated((prev) => prev.map((c) => (c.id === card.id ? { ...c, tags: updatedCardTags } : c)));
    setNewTagInput("");

    try {
      await updateDeckTags(deck.id, updatedDeckTags);
      await updateDeckCardTags(card.id, updatedCardTags, deck.id);
      if (onDeckUpdated) {
        onDeckUpdated((prev) => ({ ...prev, tags: updatedDeckTags }));
      }
    } catch (err) {
      console.error("Failed to save new tag:", err);
    } finally {
      setIsSavingTag(false);
    }
  };

  // Add all missing cards to wants
  const handleAddAllMissingToWants = async () => {
    setIsAddingWants(true);
    try {
      await addDeckMissingToWants(deck.id);
      alert("¡Cartas faltantes añadidas a tu lista de deseos!");
    } catch (err) {
      console.error("Error adding missing to wants:", err);
    } finally {
      setIsAddingWants(false);
    }
  };

  // ==========================================
  // Grouping & Sorting logic
  // ==========================================
  const groupedCards = useMemo(() => {
    const mainCards = cards.filter((c) => !c.isSideboard);
    const groups: Record<string, { category: string; cards: DeckCardWithOwnership[]; totalPrice: number }> = {};

    function addCardToGroup(cat: string, card: DeckCardWithOwnership) {
      if (!groups[cat]) {
        groups[cat] = { category: cat, cards: [], totalPrice: 0 };
      }
      groups[cat].cards.push(card);
      groups[cat].totalPrice += getCardPrice(card.cardName) * card.quantity;
    }

    if (grouping === "tags") {
      // Group by Tag: each tagged category gets the card, and cards without tags go into "Sin tag"
      for (const card of mainCards) {
        if (card.isCommander) {
          addCardToGroup("Commander", card);
          continue;
        }

        const tags = card.tags?.filter((t) => t.trim().length > 0) || [];
        if (tags.length > 0 && !disableTags) {
          for (const t of tags) {
            addCardToGroup(t, card);
          }
        } else {
          addCardToGroup("Sin tag", card);
        }
      }
    } else if (grouping === "type_and_tags" && !disableTags) {
      // Moxfield Type & Tags grouping:
      // 1. Commander
      // 2. Cards with tags appear in each tagged category
      // 3. Cards without tags appear in their MTG type
      for (const card of mainCards) {
        if (card.isCommander) {
          addCardToGroup("Commander", card);
          continue;
        }

        const tags = card.tags?.filter((t) => t.trim().length > 0) || [];
        if (tags.length > 0 && !hideDeckTags) {
          for (const t of tags) {
            addCardToGroup(t, card);
          }
        } else {
          const cat = getCardCategory(card.typeLine, card.cardName);
          const typeNames: Record<string, string> = {
            creatures: "Criatura",
            instants: "Instantáneo",
            sorceries: "Conjuro",
            artifacts: "Artefacto",
            enchantments: "Encantamiento",
            planeswalkers: "Planeswalker",
            lands: "Tierra",
            other: "Otro",
          };
          addCardToGroup(typeNames[cat] || "Otro", card);
        }
      }
    } else if (grouping === "mana_value") {
      for (const card of mainCards) {
        if (card.isCommander) {
          addCardToGroup("Commander", card);
        } else {
          const cmc = parseManaValue(card.manaCost);
          addCardToGroup(`Coste ${cmc}`, card);
        }
      }
    } else if (grouping === "color") {
      for (const card of mainCards) {
        if (card.isCommander) {
          addCardToGroup("Commander", card);
        } else {
          const colBucket = getCardColorBucket(card.manaCost);
          const colNames: Record<string, string> = {
            white: "Blanco",
            blue: "Azul",
            black: "Negro",
            red: "Rojo",
            green: "Verde",
            multi: "Multicolor",
            colorless: "Incoloro",
          };
          addCardToGroup(colNames[colBucket] || "Incoloro", card);
        }
      }
    } else {
      // Grouping by Type (or disableTags is on)
      for (const card of mainCards) {
        if (card.isCommander) {
          addCardToGroup("Commander", card);
        } else {
          const cat = getCardCategory(card.typeLine, card.cardName);
          const typeNames: Record<string, string> = {
            creatures: "Criaturas",
            instants: "Instantáneos",
            sorceries: "Conjuros",
            artifacts: "Artefactos",
            enchantments: "Encantamientos",
            planeswalkers: "Planeswalkers",
            lands: "Tierras",
            other: "Otros",
          };
          addCardToGroup(typeNames[cat] || "Otros", card);
        }
      }
    }

    // Sort cards inside each group
    Object.values(groups).forEach((g) => {
      g.cards.sort((a, b) => {
        if (sortBy === "cmc") {
          return parseManaValue(a.manaCost) - parseManaValue(b.manaCost);
        }
        if (sortBy === "price") {
          return getCardPrice(b.cardName) - getCardPrice(a.cardName);
        }
        return a.cardName.localeCompare(b.cardName);
      });
    });

    // Sort categories: Commander first, then alphabetical, "Sin tag" at the end of mainboard
    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.category === "Commander") return -1;
      if (b.category === "Commander") return 1;
      if (a.category === "Sin tag") return 1;
      if (b.category === "Sin tag") return -1;
      return a.category.localeCompare(b.category);
    });

    // Sideboard group (always placed at the end)
    const sideboardCards = cards.filter((c) => c.isSideboard);
    if (sideboardCards.length > 0) {
      const sortedSideboard = [...sideboardCards].sort((a, b) => {
        if (sortBy === "cmc") {
          return parseManaValue(a.manaCost) - parseManaValue(b.manaCost);
        }
        if (sortBy === "price") {
          return getCardPrice(b.cardName) - getCardPrice(a.cardName);
        }
        return a.cardName.localeCompare(b.cardName);
      });
      sortedGroups.push({
        category: "Sideboard",
        cards: sortedSideboard,
        totalPrice: sideboardCards.reduce(
          (acc, c) => acc + getCardPrice(c.cardName) * c.quantity,
          0
        ),
      });
    }

    return sortedGroups;
  }, [cards, grouping, disableTags, hideDeckTags, sortBy, priceSummary]);

  // Counts for bottom bar
  const mainboardCount = cards.reduce((sum, c) => (c.isSideboard ? sum : sum + (c.quantity || 1)), 0);
  const sideboardCount = cards.reduce((sum, c) => (c.isSideboard ? sum + (c.quantity || 1) : sum), 0);
  const totalDeckPrice = cards.reduce((sum, c) => (c.isSideboard ? sum : sum + getCardPrice(c.cardName) * c.quantity), 0);

  // Type counts for footer
  const typeCounts = useMemo(() => {
    const counts = { creatures: 0, instants: 0, sorceries: 0, artifacts: 0, enchantments: 0, planeswalkers: 0, lands: 0 };
    for (const c of cards) {
      if (c.isSideboard) continue;
      const cat = getCardCategory(c.typeLine, c.cardName);
      const qty = c.quantity || 1;
      if (cat in counts) {
        counts[cat as keyof typeof counts] += qty;
      }
    }
    return counts;
  }, [cards]);

  return (
    <div className="relative min-h-[calc(100vh-14rem)] space-y-6 pb-20">
      {/* Alert if deck has more than 100 cards in mainboard */}
      {mainboardCount > 100 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-400 text-sm">
                ¡Atención: El mazo principal tiene {mainboardCount} cartas!
              </p>
              <p className="text-xs text-amber-300/80">
                Supera el límite recomendado de 100 cartas para formatos como Commander / EDH.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* TOP TOOLBAR: Actions + Scryfall Search Bar (Moxfield-style)              */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        {/* Left Action Links */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddAllMissingToWants}
            disabled={isAddingWants}
            className="text-xs bg-secondary/60 hover:bg-secondary border-border"
          >
            {isAddingWants ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <BookmarkPlus className="h-3.5 w-3.5 mr-1.5 text-primary" />}
            <span>Faltantes a Wants</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const text = cards.map((c) => `${c.quantity} ${c.cardName}`).join("\n");
              navigator.clipboard.writeText(text);
              alert("¡Lista del mazo copiada al portapapeles!");
            }}
            className="text-xs bg-secondary/60 hover:bg-secondary border-border"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            <span>Copiar lista</span>
          </Button>
        </div>

        {/* Right Scryfall Card Search Bar */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar y añadir cartas al mazo..."
              className="pl-9 pr-8 text-xs bg-background/80 border-border focus-visible:ring-primary h-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Autocomplete / Search Results Popover */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 max-h-96 overflow-y-auto bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl z-50 p-2 space-y-1 divide-y divide-border/40">
              {searchResults.slice(0, 10).map((res) => (
                <div key={res.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-secondary/60 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {res.image_uris?.small && (
                      <img src={res.image_uris.small} alt={res.name} className="w-8 h-11 object-cover rounded shadow-xs" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{res.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ManaCost manaCost={res.mana_cost} className="scale-75 origin-left" />
                        <span className="text-[10px] text-muted-foreground truncate">{res.type_line}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 px-2 text-[10px] font-semibold"
                      onClick={() => handleAddCard(res, false)}
                    >
                      + Mazo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => handleAddCard(res, true)}
                    >
                      + Side
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-BAR: Filters, View Modes, Grouping, and Sorting                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/50 p-3.5 rounded-xl border border-border text-xs">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={enableCollection}
              onChange={(e) => setEnableCollection(e.target.checked)}
              className="rounded border-border accent-primary cursor-pointer"
            />
            <span>Colección activa</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={disableTags}
              onChange={(e) => setDisableTags(e.target.checked)}
              className="rounded border-border accent-primary cursor-pointer"
            />
            <span>Desactivar etiquetas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground select-none">
            <input
              type="checkbox"
              checked={hideDeckTags}
              onChange={(e) => setHideDeckTags(e.target.checked)}
              className="rounded border-border accent-primary cursor-pointer"
            />
            <span>Ocultar tags de mazo</span>
          </label>
        </div>

        {/* Right Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Vista:</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="bg-secondary/70 border border-border rounded-md px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none"
            >
              <option value="text">Texto</option>
              <option value="visual">Visual</option>
            </select>
          </div>

          {/* Grouping */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Agrupar:</span>
            <select
              value={grouping}
              onChange={(e) => setGrouping(e.target.value as any)}
              className="bg-secondary/70 border border-border rounded-md px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none"
            >
              <option value="tags">Etiqueta (Tag)</option>
              <option value="type_and_tags">Tipo y Etiquetas</option>
              <option value="type">Tipo de carta</option>
              <option value="mana_value">Coste de maná</option>
              <option value="color">Color</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-secondary/70 border border-border rounded-md px-2 py-1 text-xs text-foreground cursor-pointer focus:outline-none"
            >
              <option value="name">Nombre</option>
              <option value="cmc">Coste (CMC)</option>
              <option value="price">Precio</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN LAYOUT: Left Multi-column Category Masonry + Right Preview Showcase  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Right Column: Commander Showcase / Hovered Card Preview & Buy Links (Placed 2nd in DOM, displayed on right) */}
        <div className="lg:col-span-3 lg:order-2 space-y-4 lg:sticky lg:top-20 transition-all">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-md space-y-4">
            {/* Card Image: Hovered Card or Commander */}
            <div className="relative aspect-[5/7] w-full rounded-xl overflow-hidden border border-border/60 shadow-xl group bg-background/50">
              <img
                src={
                  hoveredCard?.imageUri ||
                  (hoveredCard
                    ? "https://cards.scryfall.io/large/front/a/1/a1d95b54-7333-4f9e-a89b-980bf8571fa6.jpg"
                    : commanderImage)
                }
                alt={hoveredCard?.cardName || deck.commander || "Comandante"}
                className="w-full h-full object-cover transition-all duration-200"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-300 text-xs font-bold max-w-[85%] truncate">
                {hoveredCard ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-foreground truncate">{hoveredCard.cardName}</span>
                  </>
                ) : (
                  <>
                    <Crown className="h-3.5 w-3.5 shrink-0" />
                    <span>Comandante</span>
                  </>
                )}
              </div>
            </div>

            {/* Price Badge */}
            <div className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground font-medium">
                {hoveredCard ? "Precio carta:" : "Precio de mercado:"}
              </span>
              <span className="text-sm font-bold font-mono text-primary">
                {formatPrice(
                  hoveredCard ? getCardPrice(hoveredCard.cardName) : commanderPrice
                )}
              </span>
            </div>

            {/* Actions & Buy Buttons */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddAllMissingToWants}
                className="w-full justify-start text-xs bg-secondary/40 hover:bg-secondary border-border"
              >
                <BookmarkPlus className="h-4 w-4 mr-2 text-primary" />
                <span>Añadir a lista de deseos</span>
              </Button>

              <a
                href={`https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                  deck.commander || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-blue-950/20 hover:bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-semibold transition-all"
              >
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Cardmarket</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              <a
                href={`https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(
                  deck.commander || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold transition-all"
              >
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>TCGplayer</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>

              {/* Provider Selector Switcher */}
              {onPriceProviderChange && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Proveedor de precios:</span>
                  </div>
                  <select
                    value={priceProvider}
                    onChange={(e) => onPriceProviderChange(e.target.value as PriceProvider)}
                    className="w-full bg-secondary/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none"
                  >
                    <option value="cardmarket">Cardmarket (EUR €)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left Column: Multi-Column Category Cards (Masonry Layout) */}
        <div className="lg:col-span-9 lg:order-1">
          {viewMode === "text" ? (
            <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 [&>*]:break-inside-avoid">
              {groupedCards.map((group) => (
                <div
                  key={group.category}
                  className="break-inside-avoid mb-6 inline-block w-full rounded-2xl border border-border bg-card/60 backdrop-blur-xs p-4 shadow-sm space-y-3"
                >
                  {/* Category Header: Category Name (Count) -- Total Price */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        {group.category}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({group.cards.reduce((s, c) => s + c.quantity, 0)})
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-primary">
                      {formatPrice(group.totalPrice)}
                    </span>
                  </div>

                  {/* Card Rows List (Compact) */}
                  <div className="space-y-0.5">
                    {group.cards.map((card) => {
                      const isOwned = card.ownedInCollection > 0;
                      const cardUnitPrice = getCardPrice(card.cardName);
                      const isEditingTags = editingCardId === card.id;

                      return (
                        <div
                          key={`${group.category}-${card.id}`}
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              card,
                              position: { x: e.clientX, y: e.clientY },
                            });
                          }}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault();
                              setTagManagerCard(card);
                              setIsTagManagerOpen(true);
                            }
                          }}
                          className="group relative flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-secondary/70 transition-all text-xs cursor-pointer select-none"
                        >
                          {/* Left: Quantity + Card Name with preview hover + Collection status */}
                          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                            <span className="font-mono text-muted-foreground w-4 text-center shrink-0">
                              {card.quantity}
                            </span>

                            <span
                              className={`font-medium truncate transition-colors ${
                                card.isCommander
                                  ? "text-amber-400 font-bold"
                                  : enableCollection && isOwned
                                  ? "text-emerald-400"
                                  : "text-foreground group-hover:text-primary"
                              }`}
                            >
                              {card.cardName}
                            </span>

                            {/* Tag badges */}
                            {!hideDeckTags && card.tags && card.tags.length > 0 && (
                              <div className="hidden sm:flex items-center gap-1 shrink-0">
                                {card.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.2 text-[9px] rounded bg-primary/10 text-primary border border-primary/20"
                                  >
                                    {t}
                                  </span>
                                ))}
                                {card.tags.length > 2 && (
                                  <span className="text-[9px] text-muted-foreground font-mono">
                                    +{card.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right: Mana Cost + Price + Actions Dropdown */}
                          <div className="flex items-center gap-2 shrink-0">
                            <ManaCost manaCost={card.manaCost} className="scale-75 origin-right" />
                            <span className="font-mono text-[11px] text-muted-foreground w-14 text-right">
                              {formatPrice(cardUnitPrice)}
                            </span>

                            {/* Menu Dropdown Button */}
                            <div className="relative">
                              <button
                                onClick={() => setEditingCardId(isEditingTags ? null : card.id)}
                                className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all"
                                title="Opciones y etiquetas"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>

                              {/* Card Options Popover */}
                              {isEditingTags && (
                                <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 p-3 space-y-3">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                    <span className="font-bold text-xs text-foreground truncate">
                                      {card.cardName}
                                    </span>
                                    <button
                                      onClick={() => setEditingCardId(null)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {/* Quantity Buttons */}
                                  <div className="flex items-center justify-between bg-secondary/50 p-1.5 rounded-lg text-xs">
                                    <span className="text-muted-foreground">Cantidad:</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleQuantityChange(card, -1)}
                                        className="p-1 rounded bg-background hover:bg-accent text-foreground"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className="font-bold font-mono px-1">{card.quantity}</span>
                                      <button
                                        onClick={() => handleQuantityChange(card, 1)}
                                        className="p-1 rounded bg-background hover:bg-accent text-foreground"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Tags Section */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                      <span className="font-semibold">Etiquetas:</span>
                                    </div>

                                    {/* Existing tags checkboxes */}
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                      {availableTags.map((t) => {
                                        const isChecked = card.tags?.includes(t);
                                        return (
                                          <button
                                            key={t}
                                            onClick={() => handleToggleCardTag(card, t)}
                                            className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-secondary/60 text-xs text-left"
                                          >
                                            <span className="truncate">{t}</span>
                                            {isChecked ? (
                                              <CheckSquare className="h-3.5 w-3.5 text-primary" />
                                            ) : (
                                              <Square className="h-3.5 w-3.5 text-muted-foreground" />
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Add custom tag input */}
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                                      <Input
                                        placeholder="Nueva etiqueta..."
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddNewTag(card);
                                          }
                                        }}
                                        className="h-7 text-xs bg-background"
                                      />
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleAddNewTag(card)}
                                        disabled={isSavingTag || !newTagInput.trim()}
                                      >
                                        +
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Delete Card Button */}
                                  <div className="pt-2 border-t border-border/60">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-full h-7 text-xs justify-center"
                                      onClick={() => {
                                        handleRemoveCard(card.id);
                                        setEditingCardId(null);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      <span>Eliminar carta</span>
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Visual Grid Mode (Organized by Section) */
            <div className="space-y-8">
              {groupedCards.map((group) => (
                <div key={group.category} className="space-y-3">
                  {/* Section Title & Price */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">
                        {group.category}
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">
                        ({group.cards.reduce((s, c) => s + c.quantity, 0)})
                      </span>
                      <span className="text-sm font-mono text-muted-foreground">
                        — {formatPrice(group.totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Card Art Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3.5">
                    {group.cards.map((card) => (
                      <div
                        key={`${group.category}-${card.id}`}
                        onMouseEnter={() => setHoveredCard(card)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            card,
                            position: { x: e.clientX, y: e.clientY },
                          });
                        }}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            e.preventDefault();
                            setTagManagerCard(card);
                            setIsTagManagerOpen(true);
                          } else {
                            setDetailCard(card);
                          }
                        }}
                        className="group relative aspect-[5/7] rounded-xl overflow-hidden border border-border/80 hover:border-primary/80 transition-all cursor-pointer shadow-md bg-card/60"
                        title={`${card.cardName} (Click para ver detalles, Shift+Click para tags, Click derecho para menú)`}
                      >
                        <img
                          src={
                            card.imageUri ||
                            "https://cards.scryfall.io/large/front/a/1/a1d95b54-7333-4f9e-a89b-980bf8571fa6.jpg"
                          }
                          alt={card.cardName}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />

                        {/* Top-left Quantity Badge */}
                        <div className="absolute top-1.5 left-1.5 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px] font-mono font-bold text-white border border-white/20 shadow-md">
                          {card.quantity}x
                        </div>

                        {/* Sideboard indicator if card is in sideboard */}
                        {card.isSideboard && (
                          <div className="absolute top-1.5 right-1.5 bg-indigo-950/90 text-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-500/40">
                            Side
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM SUMMARY FOOTER (Exact Moxfield Purple Bar Design)          */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#2b0c52] border-t border-purple-700/60 shadow-2xl backdrop-blur-md px-6 py-2.5 text-purple-100 flex items-center justify-between flex-wrap gap-4 text-xs font-medium">
        {/* Left Side: Counts + Commander + Total Price */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold">
            {mainboardCount > 100 ? (
              <div className="flex items-center gap-1.5 font-bold text-amber-300 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded-md animate-pulse">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{mainboardCount}/100 mazo principal</span>
              </div>
            ) : (
              <span>{mainboardCount} mazo principal</span>
            )}
            <span className="text-purple-400">/</span>
            <span className="text-purple-300">{sideboardCount} sideboard</span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-300 bg-purple-900/60 px-2.5 py-1 rounded-md border border-purple-600/50">
            <Crown className="h-3.5 w-3.5" />
            <span className="truncate max-w-[160px] font-bold">
              {deck.commander || "Comandante"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold font-mono text-sm text-white">
            <ShoppingBag className="h-4 w-4 text-purple-300" />
            <span>{formatPrice(totalDeckPrice)}</span>
          </div>
        </div>

        {/* Right Side: Type Breakdown Pips */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1 text-emerald-300" title="Criaturas">
            <span>👤</span>
            <span>{typeCounts.creatures}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-300" title="Instantáneos">
            <span>⚡</span>
            <span>{typeCounts.instants}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-300" title="Conjuros">
            <span>📜</span>
            <span>{typeCounts.sorceries}</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-300" title="Artefactos">
            <span>⚙️</span>
            <span>{typeCounts.artifacts}</span>
          </div>
          <div className="flex items-center gap-1 text-pink-300" title="Encantamientos">
            <span>🌟</span>
            <span>{typeCounts.enchantments}</span>
          </div>
          <div className="flex items-center gap-1 text-lime-300" title="Tierras">
            <span>🏔️</span>
            <span>{typeCounts.lands}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-300" title="Planeswalkers">
            <span>🧙</span>
            <span>{typeCounts.planeswalkers}</span>
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <CardContextMenu
          card={contextMenu.card}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onAddOne={() => handleQuantityChange(contextMenu.card, 1)}
          onAddMore={() => {
            const countStr = prompt("¿Cuántas copias deseas añadir?", "1");
            const count = parseInt(countStr || "0", 10);
            if (count > 0) {
              handleQuantityChange(contextMenu.card, count);
            }
          }}
          onRemove={() => handleRemoveCard(contextMenu.card.id)}
          onToggleSideboard={() => handleToggleSideboard(contextMenu.card)}
          onChangeTags={() => {
            setTagManagerCard(contextMenu.card);
            setIsTagManagerOpen(true);
          }}
          onViewDetails={() => setDetailCard(contextMenu.card)}
          onAddToWants={async () => {
            try {
              await addDeckMissingToWants(deck.id);
              alert("¡Carta añadida a tu lista de deseos!");
            } catch (err) {
              console.error("Error adding to wants:", err);
            }
          }}
        />
      )}

      {/* Tag Manager Dialog */}
      <DeckTagManagerDialog
        open={isTagManagerOpen}
        onOpenChange={setIsTagManagerOpen}
        card={tagManagerCard}
        allCards={cards}
        deckId={deck.id}
        deckTags={deck.tags}
        onTagsUpdated={(cardId, newTags) => {
          onCardsUpdated((prev) =>
            prev.map((c) => (c.id === cardId ? { ...c, tags: newTags } : c))
          );
        }}
        onAllCardsUpdated={(updatedCards) => {
          onCardsUpdated(() => updatedCards);
        }}
      />

      {/* Card Detail Dialog */}
      {detailCard && (
        <CardDetailDialog
          isOpen={Boolean(detailCard)}
          onOpenChange={(open) => !open && setDetailCard(null)}
          cardId={detailCard.cardScryfallId}
          cardName={detailCard.cardName}
          imageUri={detailCard.imageUri}
          manaCost={detailCard.manaCost}
          typeLine={detailCard.typeLine}
          quantity={detailCard.quantity}
          ownedInCollection={detailCard.ownedInCollection}
          missingCount={detailCard.missingCount}
          assignedQuantity={detailCard.assignedQuantity}
          requestedInDecks={detailCard.requestedInDecks}
          requestedInDecksCount={detailCard.requestedInDecksCount}
          deckId={deck.id}
          deckCardId={detailCard.id}
          isCommander={
            detailCard.isCommander ||
            detailCard.cardName?.toLowerCase() === deck.commander?.toLowerCase()
          }
        />
      )}
    </div>
  );
}
