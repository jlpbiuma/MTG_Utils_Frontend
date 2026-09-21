"use client";

import React, { useState, useEffect } from "react";
import { CardImage as Image } from "@/components/card-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManaCost } from "@/components/mana-cost";
import {
  getCardDetails,
  SpanishCardDetails,
  SpanishCardFace,
  CardPrintingDetail,
} from "@/actions/scryfall";
import { updateDeckCardVersion } from "@/actions/decks";
import { getCardPriceHistory } from "@/actions/pricing";
import { PriceHistoryChart } from "@/components/price-history-chart";
import type { CardPriceHistoryResponse } from "@/lib/pricing/types";
import { parseRulesTextTokens, translateRarityEs } from "@/lib/card-spanish-dictionary";
import { DeckRequirement } from "@/lib/schemas";
import {
  Swords,
  Shield,
  RotateCw,
  Coins,
  Palette,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  BookOpen,
  Library,
  Calendar,
  Filter,
} from "lucide-react";

interface CardDetailDialogProps {
  cardId?: string;
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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  deckId?: string;
  deckCardId?: string;
  isCommander?: boolean;
  onVersionSelect?: (version: CardPrintingDetail) => Promise<void> | void;
  defaultTab?: "versions" | "legalities" | "prices" | "rulings" | "collection";
}

// Client-side cache for card price history to avoid repeated network requests
export const priceHistoryClientCache = new Map<string, CardPriceHistoryResponse>();

export function CardDetailDialog({
  cardId,
  cardName,
  imageUri,
  manaCost,
  typeLine,
  quantity,
  ownedInCollection,
  missingCount,
  assignedQuantity,
  requestedInDecks,
  requestedInDecksCount,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  deckId,
  deckCardId,
  isCommander,
  onVersionSelect,
  defaultTab = "versions",
}: CardDetailDialogProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SpanishCardDetails | null>(null);
  const [activeFaceIndex, setActiveFaceIndex] = useState(0);
  const [activePrintIndex, setActivePrintIndex] = useState(0);
  const [selectedPrintingId, setSelectedPrintingId] = useState<string | undefined>(cardId);
  const [isUpdatingVersion, setIsUpdatingVersion] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [priceHistory, setPriceHistory] = useState<CardPriceHistoryResponse | null>(null);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  const [showAllVersions, setShowAllVersions] = useState(false);

  // Track the card name for which details were fetched so we don't re-fetch when selecting versions
  const fetchedCardRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      fetchedCardRef.current = null;
      setDetails(null);
      setFeedbackMessage(null);
      setPriceHistory(null);
      setActiveTab(defaultTab);
      setShowAllVersions(false);
      return;
    }

    // If we have already fetched details for this card while the dialog is open, do not re-fetch
    if (fetchedCardRef.current === cardName && details) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchedCardRef.current = cardName;
    setSelectedPrintingId(cardId);
    setActiveTab(defaultTab);

    getCardDetails({ id: cardId, name: cardName })
      .then((res) => {
        if (isMounted) {
          setDetails(res);
          setActiveFaceIndex(0);
          const targetId = cardId || selectedPrintingId;
          const matchIdx = res?.printings && targetId
            ? res.printings.findIndex((p) => p.id === targetId)
            : -1;
          const initialIdx = matchIdx >= 0 ? matchIdx : 0;
          setActivePrintIndex(initialIdx);
          if (res?.printings?.[initialIdx]?.id) {
            setSelectedPrintingId(res.printings[initialIdx].id);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load card details:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, cardName]);

  useEffect(() => {
    if (!isOpen || activeTab !== "prices") return;

    // Use a stable identifier for the card or printing
    const targetCardId =
      cardId ||
      details?.id ||
      selectedPrintingId ||
      details?.printings?.[0]?.id;

    if (!targetCardId) return;

    // 1. Check client-side memory cache
    const cached = priceHistoryClientCache.get(targetCardId);
    if (cached) {
      setPriceHistory(cached);
      setPriceHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setPriceHistoryLoading(true);
    getCardPriceHistory(targetCardId, "cardmarket", 30)
      .then((res) => {
        if (!cancelled && res) {
          // Store in client cache by targetCardId, catalogId, and all printing IDs
          priceHistoryClientCache.set(targetCardId, res);
          if (res.catalogId) {
            priceHistoryClientCache.set(res.catalogId, res);
          }
          if (res.series) {
            for (const s of res.series) {
              if (s.printingId) {
                priceHistoryClientCache.set(s.printingId, res);
              }
            }
          }
          setPriceHistory(res);
        }
      })
      .catch((err) => {
        console.error("Failed to load price history:", err);
        if (!cancelled) setPriceHistory(null);
      })
      .finally(() => {
        if (!cancelled) setPriceHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, cardId, details?.id, selectedPrintingId]);

  // Filter printings to last 3 years by default
  const threeYearsAgoIso = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return d.toISOString().slice(0, 10);
  }, []);

  const recentPrintings = React.useMemo(() => {
    if (!details?.printings) return [];
    return details.printings.filter((p) => {
      if (!p.released_at) return true;
      return p.released_at >= threeYearsAgoIso;
    });
  }, [details?.printings, threeYearsAgoIso]);

  // Fallback to all printings if card has no releases in the last 3 years
  const printingsToShow = React.useMemo(() => {
    if (!details?.printings) return [];
    if (showAllVersions || recentPrintings.length === 0) {
      return details.printings;
    }
    return recentPrintings;
  }, [details?.printings, recentPrintings, showAllVersions]);

  const handleSelectVersion = async (printing: CardPrintingDetail, index?: number) => {
    const targetIdx =
      index !== undefined && index >= 0
        ? index
        : (details?.printings?.findIndex((p) => p.id === printing.id) ?? 0);
    // Immediately select and switch preview image without delay or glitch
    setActivePrintIndex(targetIdx >= 0 ? targetIdx : 0);
    setSelectedPrintingId(printing.id);
    setFeedbackMessage(null);

    // Call onVersionSelect immediately for instant optimistic update in the deck view
    if (onVersionSelect) {
      try {
        await onVersionSelect(printing);
      } catch (err) {
        console.error("Error in onVersionSelect:", err);
      }
    }

    if (deckId && deckCardId) {
      setIsUpdatingVersion(true);
      try {
        await updateDeckCardVersion(deckId, deckCardId, {
          cardScryfallId: printing.id,
          imageUri: printing.image_uri || printing.image_uri_large || printing.image_uri_small,
          setCode: printing.set_code,
          isCommander,
        });
        setFeedbackMessage(
          `Versión ${printing.set_code?.toUpperCase()} #${printing.collector_number} seleccionada como estándar del mazo`
        );
      } catch (err) {
        console.error("Error al actualizar la versión del mazo:", err);
        setFeedbackMessage("Error al guardar la versión en el servidor");
      } finally {
        setIsUpdatingVersion(false);
      }
    } else {
      setFeedbackMessage(`Versión seleccionada: ${printing.set_code?.toUpperCase()} #${printing.collector_number}`);
    }
  };

  // Determine active face if double-sided
  const hasFaces = Boolean(details?.card_faces && details.card_faces.length > 1);
  const currentFace: SpanishCardFace | null = hasFaces
    ? details!.card_faces![activeFaceIndex]
    : null;

  // Active printing (edition) drives set info, prices and artwork.
  const currentPrint = details?.printings?.[activePrintIndex] ?? null;

  const formatPrice = (value?: number | null) =>
    value == null ? "—" : `${value.toFixed(2)} €`;

  const formatReleaseDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 4);
      return d.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
    } catch {
      return dateStr.slice(0, 4);
    }
  };

  // Resolved display fields (preferring active face/printing, then details)
  const displayNameEs = currentFace?.name_es || details?.name_es || cardName;
  const displayNameEn = currentFace?.name || details?.name || cardName;
  const displayTypeEs = currentFace?.type_line_es || details?.type_line_es || typeLine || "Carta";
  const displayManaCost = currentFace?.mana_cost ?? details?.mana_cost ?? manaCost;
  const displayRulesEs = currentFace?.oracle_text_es ?? details?.oracle_text_es ?? "";
  const displayFlavorEs = currentFace?.flavor_text_es ?? details?.flavor_text_es ?? "";
  const displayPower = currentFace?.power ?? details?.power;
  const displayToughness = currentFace?.toughness ?? details?.toughness;
  const displayLoyalty = currentFace?.loyalty ?? details?.loyalty;
  const displayDefense = currentFace?.defense ?? details?.defense;

  const displaySetCode = currentPrint?.set_code || details?.set;
  const displaySetName = currentPrint?.set_name || details?.set_name;
  const displayCollectorNumber = currentPrint?.collector_number || details?.collector_number;
  const displayRarity = currentPrint?.rarity || details?.rarity;

  const displayImageUri =
    (hasFaces && activeFaceIndex > 0
      ? currentFace?.image_uris?.large || currentFace?.image_uris?.normal
      : null) ||
    currentPrint?.image_uri_large ||
    currentPrint?.image_uri ||
    currentFace?.image_uris?.normal ||
    currentFace?.image_uris?.large ||
    details?.image_uris?.normal ||
    details?.image_uris?.large ||
    imageUri;

  const rarityLabel = currentPrint?.rarity
    ? translateRarityEs(currentPrint.rarity)
    : details?.rarity_es || translateRarityEs(details?.rarity);

  const getRarityBadgeStyle = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case "mythic":
      case "rara mítica":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "rare":
      case "rara":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      case "uncommon":
      case "infrecuente":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      default:
        return "bg-secondary text-muted-foreground border-border";
    }
  };

  const getLegalityIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "legal":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "banned":
      case "prohibida":
        return <XCircle className="h-3.5 w-3.5 text-rose-400" />;
      case "restricted":
      case "restringida":
        return <AlertCircle className="h-3.5 w-3.5 text-primary" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const renderFormattedRulesText = (text: string) => {
    if (!text) return <span className="text-muted-foreground italic">Sin texto de reglas</span>;

    const paragraphs = text.split("\n");

    return (
      <div className="space-y-2 text-sm leading-relaxed text-foreground">
        {paragraphs.map((p, pIdx) => {
          const tokens = parseRulesTextTokens(p);
          return (
            <p key={pIdx}>
              {tokens.map((tok, tIdx) => {
                if (tok.type === "symbol") {
                  return (
                    <ManaCost
                      key={tIdx}
                      manaCost={`{${tok.value}}`}
                      className="inline-flex align-middle mx-0.5"
                    />
                  );
                }
                return <span key={tIdx}>{tok.value}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto p-0 border-border bg-popover rounded-xl sm:rounded-xl shadow-2xl">
        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <DialogHeader className="pb-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight flex items-center gap-3">
                  <span>{displayNameEs}</span>
                  {details?.has_spanish_print ? (
                    <Badge className="bg-emerald-500/15 border-emerald-500/40 text-emerald-300 text-[10px] font-semibold py-0.5">
                      Oficial ES
                    </Badge>
                  ) : (
                    <Badge className="bg-primary/15 border-primary/40 text-primary text-[10px] font-semibold py-0.5">
                      Traducida ES
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Nombre original: <span className="text-muted-foreground">{displayNameEn}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ManaCost manaCost={displayManaCost} />
                {details?.cmc !== undefined && (
                  <Badge variant="outline" className="border-border bg-card text-xs font-mono text-muted-foreground">
                    CMC: {details.cmc}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Main 2-Column Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-start">
            {/* Left Column: Visual Card Art & Controls */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] aspect-[5/7] rounded-lg overflow-hidden border border-border bg-card foil-card-effect group">
                {displayImageUri ? (
                  <Image
                    src={displayImageUri}
                    alt={displayNameEs}
                    fill
                    sizes="(max-width: 768px) 90vw, 280px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                    <BookOpen className="h-10 w-10 mb-2" />
                    <span className="text-sm font-semibold">{displayNameEs}</span>
                    <span className="text-xs mt-1 text-muted-foreground">Ilustración no disponible</span>
                  </div>
                )}

                {/* Flip Button for MDFC / Transform cards */}
                {hasFaces && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveFaceIndex((prev) => (prev === 0 ? 1 : 0))}
                    className="absolute bottom-3 right-3 bg-background/90 border-primary/50 text-primary hover:bg-card text-xs font-semibold gap-1.5"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Girar cara
                  </Button>
                )}
              </div>

              {/* Set & Rarity Strip below card art */}
              <div className="w-full max-w-[280px] mt-4 p-3 rounded-xl border border-border/80 bg-card/40 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rareza</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${getRarityBadgeStyle(rarityLabel)}`}>
                    {rarityLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Colección</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[150px]" title={displaySetName || displaySetCode}>
                    {displaySetName || displaySetCode || "—"} {displaySetCode && `(${displaySetCode})`}
                  </span>
                </div>

                {displayCollectorNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nº de Carta</span>
                    <span className="font-mono text-foreground">#{displayCollectorNumber}</span>
                  </div>
                )}

                {details?.artist && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Palette className="h-3 w-3" /> Ilustrador
                    </span>
                    <span className="font-medium text-muted-foreground truncate max-w-[140px]">{details.artist}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Card Details, Rules, Combat, and Tabs */}
            <div className="md:col-span-7 space-y-5">
              {/* Type line & Combat Stats */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tipo de Carta</p>
                  <p className="text-base font-semibold text-primary mt-0.5">{displayTypeEs}</p>
                </div>

                {displayPower !== undefined && displayToughness !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 font-semibold text-base font-mono">
                    <Swords className="h-4 w-4" />
                    <span>
                      {displayPower}/{displayToughness}
                    </span>
                  </div>
                )}

                {displayLoyalty !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/30 text-primary font-semibold text-base font-mono">
                    <Shield className="h-4 w-4" />
                    <span>Lealtad: {displayLoyalty}</span>
                  </div>
                )}

                {displayDefense !== undefined && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/50 text-sky-300 font-semibold text-base font-mono">
                    <Shield className="h-4 w-4" />
                    <span>Defensa: {displayDefense}</span>
                  </div>
                )}
              </div>

              {/* Rules Box in Spanish */}
              <div className="p-4 rounded-xl border border-border/90 bg-card/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    Texto de Reglas (Oficial en Español)
                  </span>
                  {hasFaces && (
                    <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/30">
                      Cara {activeFaceIndex + 1} de {details!.card_faces!.length}
                    </span>
                  )}
                </div>

                <div className="bg-background/60 p-3.5 rounded-lg border border-border/70">
                  {renderFormattedRulesText(displayRulesEs)}
                </div>

                {/* Flavor text in Spanish */}
                {displayFlavorEs && (
                  <div className="pt-2 border-t border-border/60 text-xs italic text-muted-foreground font-serif leading-relaxed">
                    «{displayFlavorEs}»
                  </div>
                )}
              </div>

              {/* Tabs for Technical Data, Legalities, Prices & Collection */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
                <TabsList className="flex flex-wrap bg-card border border-border">
                  <TabsTrigger value="versions" className="text-xs flex-1 min-w-0 flex items-center justify-center gap-1.5 font-semibold">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Versiones</span>
                    {details?.printings?.length ? (
                      <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.2 rounded-full font-mono">
                        {printingsToShow.length !== details.printings.length
                          ? `${printingsToShow.length}/${details.printings.length}`
                          : details.printings.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="legalities" className="text-xs flex-1 min-w-0">
                    Legalidad
                  </TabsTrigger>
                  <TabsTrigger value="prices" className="text-xs flex-1 min-w-0">
                    Precios
                  </TabsTrigger>
                  <TabsTrigger value="rulings" className="text-xs flex-1 min-w-0">
                    Rulings
                  </TabsTrigger>
                  <TabsTrigger value="collection" className="text-xs flex-1 min-w-0">
                    Mi Colección
                  </TabsTrigger>
                </TabsList>

                {/* Versions Tab: First tab with visible miniatures & auto-select */}
                <TabsContent value="versions" className="mt-3 space-y-3">
                  {feedbackMessage && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feedbackMessage}</span>
                    </div>
                  )}

                  {/* Filter bar: Last 3 years vs All */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-card/60 border border-border/80 text-xs">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">Mostrar:</span>
                      <div className="inline-flex rounded-lg bg-secondary/80 p-0.5 border border-border">
                        <button
                          type="button"
                          onClick={() => setShowAllVersions(false)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            !showAllVersions
                              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Últimos 3 años ({recentPrintings.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAllVersions(true)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            showAllVersions
                              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Todas ({details?.printings?.length ?? 0})
                        </button>
                      </div>
                    </div>

                    {recentPrintings.length === 0 && (details?.printings?.length ?? 0) > 0 && (
                      <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                        Sin ediciones en 3 años · Mostrando todas
                      </span>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground ml-auto">
                      <span>
                        {deckId
                          ? "Haz clic para fijar versión del mazo."
                          : "Haz clic para ver detalles y precios."}
                      </span>
                      {isUpdatingVersion && (
                        <span className="text-primary font-medium animate-pulse">
                          Guardando...
                        </span>
                      )}
                    </div>
                  </div>

                  {printingsToShow && printingsToShow.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                      {printingsToShow.map((p) => {
                        const isStandard = selectedPrintingId
                          ? p.id === selectedPrintingId
                          : details?.printings?.[activePrintIndex]?.id === p.id;
                        const isCurrentlyActive = details?.printings?.[activePrintIndex]?.id === p.id;
                        const thumbUri = p.image_uri_small || p.image_uri || p.image_uri_large;
                        const releaseFormatted = formatReleaseDate(p.released_at);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const originalIdx = details?.printings?.findIndex((item) => item.id === p.id) ?? -1;
                              handleSelectVersion(p, originalIdx >= 0 ? originalIdx : undefined);
                            }}
                            className={`group relative flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                              isStandard
                                ? "bg-primary/10 border-primary ring-1 ring-ring"
                                : isCurrentlyActive
                                ? "bg-secondary border-border"
                                : "bg-card border-border hover:bg-accent hover:border-primary/40"
                            }`}
                          >
                            {/* Miniature Thumbnail */}
                            <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded-md overflow-hidden bg-background border border-border">
                              {thumbUri ? (
                                <Image
                                  src={thumbUri}
                                  alt={`${p.set_name || p.set_code} #${p.collector_number}`}
                                  fill
                                  sizes="56px"
                                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-foreground text-center p-1 bg-card">
                                  <BookOpen className="h-4 w-4 mb-1 text-muted-foreground" />
                                  <span className="font-mono">{p.set_code?.toUpperCase()}</span>
                                </div>
                              )}
                              {isStandard && (
                                <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                  <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {p.set_code && (
                                    <img
                                      src={`https://svgs.scryfall.io/sets/${p.set_code.toLowerCase()}.svg`}
                                      alt=""
                                      aria-hidden="true"
                                      className="w-3.5 h-3.5 object-contain shrink-0 filter invert dark:invert-0 opacity-75"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  )}
                                  <span
                                    className="font-bold text-foreground text-xs truncate group-hover:text-primary transition-colors"
                                    title={p.set_name || p.set_code}
                                  >
                                    {p.set_name || p.set_code?.toUpperCase()}
                                  </span>
                                </div>
                                {p.rarity && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${getRarityBadgeStyle(
                                      p.rarity
                                    )}`}
                                  >
                                    {translateRarityEs(p.rarity)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                                <span className="bg-secondary/90 px-1.5 py-0.5 rounded text-muted-foreground font-bold text-[10px]">
                                  {p.set_code?.toUpperCase()}
                                </span>
                                <span>#{p.collector_number}</span>
                                {releaseFormatted && (
                                  <span className="text-muted-foreground text-[10px] flex items-center gap-0.5 font-sans">
                                    <Calendar className="h-2.5 w-2.5 opacity-60" />
                                    {releaseFormatted}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[10px] pt-0.5">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <span>Cardmarket:</span>
                                  <span className="font-bold text-primary font-mono">
                                    {formatPrice(p.trend ?? p.price_eur)}
                                  </span>
                                </div>
                              </div>

                              {isStandard && (
                                <div className="pt-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/15 border border-primary/40 px-1.5 py-0.2 rounded-full">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Estándar en mazo
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : loading ? (
                    <div className="p-8 text-center text-muted-foreground space-y-2">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                      <p className="text-xs">Cargando versiones disponibles...</p>
                    </div>
                  ) : (
                    <p className="p-4 text-center text-muted-foreground text-xs">
                      No hay otras versiones registradas para esta carta.
                    </p>
                  )}
                </TabsContent>

                {/* Format Legalities Tab */}
                <TabsContent value="legalities" className="mt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-border/80 bg-card/30 text-xs">
                    {details?.legalities && details.legalities.length > 0 ? (
                      details.legalities.map((item) => (
                        <div
                          key={item.format}
                          className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/60"
                        >
                          <span className="text-muted-foreground truncate pr-1 font-medium">{item.format_name}</span>
                          <span
                            className={`flex items-center gap-1 font-semibold text-[11px] ${
                              item.status === "legal"
                                ? "text-emerald-400"
                                : item.status === "banned"
                                ? "text-rose-400"
                                : item.status === "restricted"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {getLegalityIcon(item.status)}
                            {item.status_es}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="col-span-full text-center text-muted-foreground py-3">
                        Cargando formatos de legalidad...
                      </p>
                    )}
                  </div>
                </TabsContent>

                {/* Market Prices Tab */}
                <TabsContent value="prices" className="mt-3">
                  <div className="space-y-3 p-3 rounded-xl border border-border/80 bg-card/30 text-xs">
                    {currentPrint ? (
                      <>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                            {currentPrint.set_code?.toUpperCase()} · #{currentPrint.collector_number}
                          </span>
                          <span className="text-muted-foreground">Cardmarket / EUR</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">Trend</p>
                            <p className="text-lg font-semibold text-primary font-mono mt-1">
                              {formatPrice(currentPrint.trend)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">Mín</p>
                            <p className="text-lg font-semibold text-emerald-400 font-mono mt-1">
                              {formatPrice(currentPrint.min)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">Máx</p>
                            <p className="text-lg font-semibold text-rose-400 font-mono mt-1">
                              {formatPrice(currentPrint.max)}
                            </p>
                          </div>
                        </div>
                        <p className="text-center text-muted-foreground pt-1">
                          Precios oficiales diarios de Cardmarket vía MTGJSON
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground">Sin precios de mercado registrados para esta carta.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">Cardmarket / EUR</p>
                            <p className="text-lg font-semibold text-primary font-mono mt-1">
                              {details?.prices?.eur ? `${details.prices.eur} €` : "—"}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">EUR Foil</p>
                            <p className="text-lg font-semibold text-primary font-mono mt-1">
                              {details?.prices?.eur_foil ? `${details.prices.eur_foil} €` : "—"}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">Mercado USD</p>
                            <p className="text-lg font-semibold text-sky-300 font-mono mt-1">
                              {details?.prices?.usd ? `$${details.prices.usd}` : "—"}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-background/60 border border-border/70 text-center">
                            <p className="text-muted-foreground text-[11px]">USD Foil</p>
                            <p className="text-lg font-semibold text-sky-400 font-mono mt-1">
                              {details?.prices?.usd_foil ? `$${details.prices.usd_foil}` : "—"}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-border/70 space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-muted-foreground font-semibold uppercase tracking-wider">
                          Histórico por printing (30 días)
                        </span>
                        <span className="text-muted-foreground">Cardmarket</span>
                      </div>
                      {priceHistoryLoading ? (
                        <p className="text-center text-muted-foreground py-8">Cargando histórico…</p>
                      ) : (
                        <PriceHistoryChart
                          series={priceHistory?.series ?? []}
                          expansions={priceHistory?.expansions ?? []}
                          activePrintingId={currentPrint?.id}
                          currencySymbol="€"
                          height={280}
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Rulings Tab */}
                <TabsContent value="rulings" className="mt-3">
                  {details?.rulings && details.rulings.length > 0 ? (
                    <div className="space-y-3 p-3">
                      {details.rulings.map((ruling, index) => (
                        <div
                          key={`${ruling.date}-${index}`}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/40"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-mono text-primary">
                              {ruling.date.slice(0, 10)}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {ruling.source || "Scryfall"}
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{ruling.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 text-center text-muted-foreground">
                      No hay rulings adicionales para esta carta.
                    </p>
                  )}
                </TabsContent>

                {/* Collection & Decks Status Tab */}
                <TabsContent value="collection" className="mt-3">
                  <div className="p-4 rounded-xl border border-border/80 bg-card/30 text-xs space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-lg bg-background/60 border border-border">
                        <span className="text-muted-foreground text-[11px]">En tu Colección</span>
                        <p className="text-xl font-semibold text-emerald-400 font-mono mt-0.5">
                          {ownedInCollection ?? quantity ?? 0} copias
                        </p>
                      </div>

                      {assignedQuantity !== undefined && (
                        <div className="p-2.5 rounded-lg bg-background/60 border border-border">
                          <span className="text-muted-foreground text-[11px]">Asignadas a Mazos</span>
                          <p className="text-xl font-semibold text-sky-400 font-mono mt-0.5">
                            {assignedQuantity} copias
                          </p>
                        </div>
                      )}

                      {missingCount !== undefined && (
                        <div className="p-2.5 rounded-lg bg-background/60 border border-border">
                          <span className="text-muted-foreground text-[11px]">Faltantes en este Mazo</span>
                          <p className="text-xl font-semibold text-rose-400 font-mono mt-0.5">
                            {missingCount} copias
                          </p>
                        </div>
                      )}
                    </div>

                    {requestedInDecks && requestedInDecks.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/50">
                        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold mb-2">
                          <Layers className="h-4 w-4 text-indigo-400" />
                          <span>
                            Se pide en {requestedInDecksCount ?? requestedInDecks.length}{" "}
                            {(requestedInDecksCount ?? requestedInDecks.length) === 1 ? "mazo" : "mazos"}:
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {requestedInDecks.map((req) => (
                            <span
                              key={req.deckId}
                              className="px-2 py-0.5 rounded bg-card/80 border border-indigo-700/40 text-xs text-indigo-200 font-medium"
                            >
                              {req.deckName} ({req.quantity}
                              {req.completionPercentage != null
                                ? `, ${req.completionPercentage}%`
                                : ""}
                              )
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
