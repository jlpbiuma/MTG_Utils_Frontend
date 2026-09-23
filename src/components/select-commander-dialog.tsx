"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CardImage as Image } from "@/components/card-image";
import { Crown, AlertCircle, Loader2, Sparkles, Search, RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { DeckCardWithOwnership } from "@/lib/schemas";
import { normalizeCardName, getPartnerInfo } from "@/lib/card-utils";
import { setDeckCommander } from "@/actions/decks";
import { getCardNamed, searchCards, ScryfallCardResult } from "@/actions/scryfall";

interface SelectCommanderDialogProps {
  deckId: string;
  deckName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckCards: DeckCardWithOwnership[];
  currentCommander?: string | null;
  onCommanderSelected: (commanderName: string, imageUri?: string) => void;
  initialPartnerMode?: boolean;
}

const TYPE_LINE_MAX_LENGTH = 52;

export function truncateTypeLine(typeLine: string): string {
  if (typeLine.length <= TYPE_LINE_MAX_LENGTH) return typeLine;

  const prefix = typeLine.slice(0, TYPE_LINE_MAX_LENGTH - 1).trimEnd();
  const wordBoundary = prefix.lastIndexOf(" ");
  const shortened = (wordBoundary > 0 ? prefix.slice(0, wordBoundary) : prefix)
    .replace(/\s*(?:\/\/|—|-)\s*$/, "");

  return `${shortened}…`;
}

export function isCommanderCandidate(typeLine?: string | null): boolean {
  const type = typeLine?.toLowerCase() ?? "";
  const isLegendary = type.includes("legendary");
  const isLegendaryCreature = isLegendary && type.includes("creature");
  const isLegendaryVehicle = isLegendary && type.includes("artifact") && type.includes("vehicle");

  return isLegendaryCreature || isLegendaryVehicle;
}

export function DoubleFacePreview({ faces }: { faces: string[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const handleEnter = (event: React.MouseEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({
      left: Math.min(rect.right + 10, window.innerWidth - 500),
      top: Math.max(8, Math.min(rect.top - 80, window.innerHeight - 360)),
    });
    setOpen(true);
  };

  return (
    <span
      className="inline-flex shrink-0 cursor-help text-primary"
      title="Carta transformable: ver ambas caras"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <RotateCw className="h-3.5 w-3.5" />
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] flex gap-2 rounded-lg border border-border bg-popover p-2"
          style={{ left: position.left, top: position.top }}
        >
          {faces.slice(0, 2).map((face, index) => (
            <img key={`${face}-${index}`} src={face} alt={`Cara ${index + 1}`} className="h-[280px] w-[200px] rounded-lg object-cover" />
          ))}
        </div>,
        document.body
      )}
    </span>
  );
}

export function SelectCommanderDialog({
  deckId,
  deckName,
  open,
  onOpenChange,
  deckCards,
  currentCommander,
  onCommanderSelected,
  initialPartnerMode = false,
}: SelectCommanderDialogProps) {
  const [commanderInput, setCommanderInput] = useState(currentCommander || "");
  const [candidateFilter, setCandidateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerInput, setPartnerInput] = useState("");
  const [selectedCommander, setSelectedCommander] = useState<{
    name: string;
    scryfallId?: string;
    imageUri?: string;
    specificPartnerName?: string | null;
  } | null>(null);
  const [specificPartnerCard, setSpecificPartnerCard] = useState<{
    name: string;
    scryfallId?: string;
    imageUri?: string;
    typeLine?: string;
    inDeck?: boolean;
  } | null>(null);
  const [partnerCandidateIds, setPartnerCandidateIds] = useState<Set<string>>(new Set());
  const [loadingPartnerCandidates, setLoadingPartnerCandidates] = useState(false);
  const [currentCommanderDetails, setCurrentCommanderDetails] = useState<ScryfallCardResult | null>(null);
  const [resolvedCardMetadata, setResolvedCardMetadata] = useState<
    Record<
      string,
      {
        typeLine?: string;
        imageUri?: string;
        faces?: string[];
        oracleText?: string;
        allParts?: ScryfallCardResult["all_parts"];
      }
    >
  >({});

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSelectedCommander(null);
      setSpecificPartnerCard(null);
      setPartnerInput("");
      setError(null);
      setCandidateFilter("");
      setCurrentCommanderDetails(null);
      setPartnerCandidateIds(new Set());
      setLoadingPartnerCandidates(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || deckCards.length === 0) return;
    let cancelled = false;
    const unresolved = deckCards;

    Promise.all(
      unresolved.map(async (card) => {
        const details = await getCardNamed(card.cardName);
        return [
          card.id,
          {
            typeLine: details?.type_line,
            imageUri: details?.image_uris?.normal,
            faces: details?.card_faces?.map((face) => face.image_uris?.normal).filter((uri): uri is string => Boolean(uri)),
            oracleText: details?.oracle_text || details?.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n"),
            allParts: details?.all_parts,
          },
        ] as const;
      })
    ).then((entries) => {
      if (!cancelled) setResolvedCardMetadata(Object.fromEntries(entries));
    });

    return () => { cancelled = true; };
  }, [open, deckCards]);

  const cardsWithMetadata = useMemo(
    () => deckCards.map((card) => ({ ...card, ...resolvedCardMetadata[card.id] })),
    [deckCards, resolvedCardMetadata]
  );

  const candidateCards = useMemo(() => {
    const candidates = cardsWithMetadata
      .filter((card) => !card.isSideboard)
      .filter((card) => card.canBeCommander ?? isCommanderCandidate(card.typeLine));

    const byCardName = new Map<string, (typeof candidates)[number]>();
    for (const card of candidates) {
      const key = normalizeCardName(card.cardName);
      const existing = byCardName.get(key);
      if (!existing || (card.isCommander && !existing.isCommander)) {
        byCardName.set(key, card);
      }
    }

    return Array.from(byCardName.values()).sort((a, b) => {
      const aLeg = (a.typeLine || "").toLowerCase().includes("legendary");
      const bLeg = (b.typeLine || "").toLowerCase().includes("legendary");
      if (aLeg && !bLeg) return -1;
      if (!aLeg && bLeg) return 1;
      return a.cardName.localeCompare(b.cardName);
    });
  }, [cardsWithMetadata]);

  const filteredCandidates = useMemo(() => {
    if (!candidateFilter.trim()) return candidateCards;
    const q = candidateFilter.toLowerCase().trim();
    return candidateCards.filter((c) => c.cardName.toLowerCase().includes(q));
  }, [candidateCards, candidateFilter]);

  // Fetch current commander details if single commander
  useEffect(() => {
    if (!open || !currentCommander || currentCommander.includes(" // ")) return;
    let cancelled = false;
    const singleName = currentCommander.split(" // ")[0].trim();
    getCardNamed(singleName).then((res) => {
      if (!cancelled && res) setCurrentCommanderDetails(res);
    });
    return () => {
      cancelled = true;
    };
  }, [open, currentCommander]);

  const currentCommanderPartnerInfo = useMemo(() => {
    if (!currentCommander || currentCommander.includes(" // ")) return null;
    const singleName = currentCommander.split(" // ")[0].trim().toLowerCase();
    const currentCard = cardsWithMetadata.find(
      (c) => c.cardName.toLowerCase() === singleName
    );
    const oracleText =
      currentCommanderDetails?.oracle_text ||
      currentCommanderDetails?.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n") ||
      currentCard?.oracleText;
    const allParts = currentCommanderDetails?.all_parts || currentCard?.allParts;
    return getPartnerInfo(oracleText, allParts);
  }, [currentCommander, currentCommanderDetails, cardsWithMetadata]);

  const partnerCandidates = useMemo(() => {
    if (!selectedCommander) return [];
    const selectedName = selectedCommander.name.toLowerCase();
    return candidateCards.filter((card) => {
      if (card.cardName.toLowerCase() === selectedName) return false;
      if (selectedCommander.specificPartnerName) {
        return card.cardName.toLowerCase() === selectedCommander.specificPartnerName.toLowerCase();
      }
      return partnerCandidateIds.has(card.id);
    });
  }, [candidateCards, selectedCommander, partnerCandidateIds]);

  useEffect(() => {
    if (!selectedCommander) return;

    let cancelled = false;
    Promise.all(
      candidateCards
        .filter((card) =>
          card.cardName.toLowerCase() !== selectedCommander.name.toLowerCase() &&
          (card.typeLine || "").toLowerCase().includes("legendary") &&
          (card.typeLine || "").toLowerCase().includes("creature")
        )
        .map(async (card) => {
          if (
            selectedCommander.specificPartnerName &&
            card.cardName.toLowerCase() === selectedCommander.specificPartnerName.toLowerCase()
          ) {
            return card.id;
          }
          if (selectedCommander.specificPartnerName) {
            return null;
          }
          const details = await getCardNamed(card.cardName);
          const oracle = details?.oracle_text || details?.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n");
          const info = getPartnerInfo(oracle, details?.all_parts);
          return info.hasPartner ? card.id : null;
        })
    ).then((ids) => {
      if (!cancelled) {
        setPartnerCandidateIds(new Set(ids.filter((id): id is string => Boolean(id))));
        setLoadingPartnerCandidates(false);
      }
    });

    return () => { cancelled = true; };
  }, [candidateCards, selectedCommander]);

  const handleSelect = useCallback(
    async (
      name: string,
      scryfallId?: string,
      imageUri?: string,
      forcePartnerMode: boolean = false
    ) => {
      if (!name.trim()) {
        setError("Por favor, ingresa el nombre de un comandante");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let card = await getCardNamed(name.trim());
        if (!card) {
          const searchRes = await searchCards(name.trim());
          if (searchRes.data && searchRes.data.length > 0) {
            card = searchRes.data[0];
          }
        }

        const cardName = card?.name || name.trim();
        const chosen = {
          name: cardName,
          scryfallId: scryfallId || card?.id,
          imageUri: imageUri || card?.image_uris?.normal,
        };

        const oracleText =
          card?.oracle_text ||
          card?.card_faces?.map((f) => f.oracle_text).filter(Boolean).join("\n") ||
          "";
        const partnerInfo = getPartnerInfo(oracleText, card?.all_parts);

        if (partnerInfo.hasPartner || forcePartnerMode) {
          setSelectedCommander({
            ...chosen,
            specificPartnerName: partnerInfo.specificPartner,
          });
          setPartnerInput(partnerInfo.specificPartner || "");
          setLoadingPartnerCandidates(!partnerInfo.specificPartner);

          if (partnerInfo.specificPartner) {
            const specificDetails = await getCardNamed(partnerInfo.specificPartner);
            const inDeck = candidateCards.some(
              (c) => c.cardName.toLowerCase() === partnerInfo.specificPartner!.toLowerCase()
            );
            setSpecificPartnerCard({
              name: specificDetails?.name || partnerInfo.specificPartner,
              scryfallId: specificDetails?.id,
              imageUri: specificDetails?.image_uris?.normal,
              typeLine: specificDetails?.type_line,
              inDeck,
            });
          } else {
            setSpecificPartnerCard(null);
          }
          return;
        }

        const res = await setDeckCommander(deckId, chosen.name, chosen.scryfallId, chosen.imageUri);
        onCommanderSelected(chosen.name, res?.commanderImageUri || chosen.imageUri);
        handleOpenChange(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar el comandante");
      } finally {
        setLoading(false);
      }
    },
    [deckId, candidateCards, onCommanderSelected, handleOpenChange]
  );

  // If opened directly in partner mode for current single commander
  useEffect(() => {
    if (!open || !initialPartnerMode || !currentCommander || currentCommander.includes(" // ")) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        handleSelect(currentCommander, undefined, undefined, true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialPartnerMode, currentCommander, handleSelect]);

  const handleSaveSoloCommander = async () => {
    if (!selectedCommander) return;
    setLoading(true);
    setError(null);
    try {
      const res = await setDeckCommander(
        deckId,
        selectedCommander.name,
        selectedCommander.scryfallId,
        selectedCommander.imageUri
      );
      onCommanderSelected(selectedCommander.name, res?.commanderImageUri || selectedCommander.imageUri);
      handleOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el comandante");
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSave = async (overridePartner?: {
    name: string;
    scryfallId?: string;
    imageUri?: string;
  }) => {
    if (!selectedCommander) return;
    const targetName = (overridePartner?.name || partnerInput).trim();
    if (!targetName) {
      setError("Selecciona o escribe un compañero para este comandante");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let partnerDetails = overridePartner;
      if (!partnerDetails || !partnerDetails.scryfallId) {
        let card = await getCardNamed(targetName);
        if (!card) {
          const searchRes = await searchCards(targetName);
          if (searchRes.data && searchRes.data.length > 0) {
            card = searchRes.data[0];
          }
        }
        partnerDetails = {
          name: card?.name || targetName,
          scryfallId: card?.id,
          imageUri: card?.image_uris?.normal,
        };
      }

      await setDeckCommander(
        deckId,
        selectedCommander.name,
        selectedCommander.scryfallId,
        selectedCommander.imageUri,
        partnerDetails
      );
      onCommanderSelected(
        `${selectedCommander.name} // ${partnerDetails.name}`,
        selectedCommander.imageUri
      );
      handleOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar los comandantes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg min-w-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <Crown className="h-6 w-6 text-primary" />
            Asignar Comandante al Mazo
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Asigna un comandante a {deckName || "este mazo"} para consultar recomendaciones comunitarias de EDHREC y estadísticas de legalidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Active Partner Selection Block */}
          {selectedCommander && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  {selectedCommander.name} tiene Partner
                </label>
                {selectedCommander.specificPartnerName && (
                  <Badge variant="outline" className="text-[10px] bg-primary/15 border-primary/40 text-primary">
                    Compañero específico
                  </Badge>
                )}
              </div>

              {/* Official / Specific Partner Card Display */}
              {specificPartnerCard && (
                <div className="rounded-lg border border-primary/30 bg-background/80 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Compañero oficial (Partner with):
                    </span>
                    {specificPartnerCard.inDeck ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                        En este mazo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 text-muted-foreground">
                        Fuera del mazo
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CardPreviewHover cardName={specificPartnerCard.name} imageUri={specificPartnerCard.imageUri}>
                        {specificPartnerCard.imageUri ? (
                          <Image
                            src={specificPartnerCard.imageUri}
                            alt={specificPartnerCard.name}
                            width={32}
                            height={44}
                            sizes="32px"
                            className="w-8 h-11 object-cover rounded-md border border-border shrink-0 cursor-pointer"
                          />
                        ) : (
                          <div className="w-8 h-11 rounded-md bg-secondary border border-border flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                            MTG
                          </div>
                        )}
                      </CardPreviewHover>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <CardPreviewHover cardName={specificPartnerCard.name} imageUri={specificPartnerCard.imageUri}>
                          <span className="font-semibold text-xs text-foreground truncate cursor-pointer hover:text-primary block">
                            {specificPartnerCard.name}
                          </span>
                        </CardPreviewHover>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {truncateTypeLine(specificPartnerCard.typeLine || "Criatura legendaria")}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="mana"
                      disabled={loading}
                      onClick={() => handlePartnerSave(specificPartnerCard)}
                      className="h-8 px-3 text-xs shrink-0 font-medium"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Agregar como Partner"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Other Partner Candidates in Deck */}
              {loadingPartnerCandidates && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Buscando compañeros compatibles...
                </p>
              )}

              {!selectedCommander.specificPartnerName && partnerCandidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Compañeros compatibles en este mazo:</p>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {partnerCandidates.map((card) => (
                      <Button
                        key={card.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-8 px-2 text-xs border-border hover:border-primary"
                        onClick={() => setPartnerInput(card.cardName)}
                        disabled={loading}
                      >
                        <span className="truncate">{card.cardName}</span>
                        <span className="ml-2 text-[10px] text-muted-foreground shrink-0">Elegir</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!loadingPartnerCandidates && !selectedCommander.specificPartnerName && partnerCandidates.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No hay otra criatura legendaria con Partner en este mazo.</p>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] text-muted-foreground">
                  {selectedCommander.specificPartnerName ? "O escribe otro compañero manualmente:" : "O escribe el nombre de su compañero:"}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del comandante compañero"
                    value={partnerInput}
                    onChange={(e) => setPartnerInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePartnerSave();
                      }
                    }}
                    className="border-border text-xs h-8"
                  />
                  <Button
                    type="button"
                    variant="mana"
                    size="sm"
                    onClick={() => handlePartnerSave()}
                    disabled={loading || !partnerInput.trim()}
                    className="h-8 px-3 text-xs shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar pareja"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCommander(null);
                    setSpecificPartnerCard(null);
                    setPartnerInput("");
                  }}
                  disabled={loading}
                  className="text-xs h-7 px-2"
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveSoloCommander}
                  disabled={loading}
                  className="text-xs h-7 px-2.5 border-border hover:border-primary text-muted-foreground hover:text-foreground"
                  title="Guardar como único comandante sin pareja"
                >
                  Solo {selectedCommander.name.split(",")[0]} (sin partner)
                </Button>
              </div>
            </div>
          )}

          {/* Banner if current commander has Partner and is alone */}
          {currentCommander && currentCommanderPartnerInfo?.hasPartner && !selectedCommander && !currentCommander.includes(" // ") && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-primary/40 bg-primary/10 text-xs">
              <div className="space-y-0.5 min-w-0 pr-2">
                <p className="font-semibold text-primary flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Tu comandante actual ({currentCommander}) tiene Partner
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {currentCommanderPartnerInfo.specificPartner
                    ? `Tiene pareja específica con ${currentCommanderPartnerInfo.specificPartner}.`
                    : "No tiene compañero asignado aún."}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="mana"
                onClick={() => handleSelect(currentCommander, undefined, undefined, true)}
                disabled={loading}
                className="h-7 text-xs px-2.5 shrink-0"
              >
                Agregar Partner
              </Button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate list from current deck cards */}
          {candidateCards.length > 0 && (
            <div className="w-full min-w-0 space-y-2 overflow-hidden">
              <div className="flex min-w-0 flex-col gap-2">
                <label className="min-w-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Elegir de las cartas del mazo ({candidateCards.length})
                </label>
                {candidateCards.length > 6 && (
                  <div className="relative w-full min-w-0">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={candidateFilter}
                      onChange={(e) => setCandidateFilter(e.target.value)}
                      className="w-full h-7 pl-6 pr-2 bg-background border border-border rounded-md text-xs text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="w-full min-w-0 max-h-48 overflow-x-hidden overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {filteredCandidates.map((card) => {
                  const isLegendary = (card.typeLine || "").toLowerCase().includes("legendary");
                  const isCurrent =
                    currentCommander === card.cardName ||
                    currentCommander?.split(" // ")[0].trim() === card.cardName;
                  const cardPartnerInfo = getPartnerInfo(card.oracleText, card.allParts);

                  return (
                    <div
                      key={card.id}
                      className={`flex min-w-0 items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-primary/10 border-primary/50"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri}>
                          {card.imageUri ? (
                            <Image
                              src={card.imageUri}
                              alt={card.cardName}
                              width={32}
                              height={44}
                              sizes="32px"
                              className="w-8 h-11 object-cover rounded-md border border-border shrink-0 cursor-pointer"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded-md bg-secondary border border-border flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                              MTG
                            </div>
                          )}
                        </CardPreviewHover>

                        <div className="min-w-0 flex-1 overflow-hidden">
                          <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri}>
                            <span className="font-semibold text-xs text-foreground truncate cursor-pointer hover:text-primary block">
                              {card.cardName}
                            </span>
                          </CardPreviewHover>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            {isLegendary && (
                              <Badge variant="outline" className="shrink-0 text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
                                Legendaria
                              </Badge>
                            )}
                            {cardPartnerInfo.hasPartner && (
                              <Badge variant="outline" className="shrink-0 text-[9px] px-1 py-0 bg-secondary text-secondary-foreground border-border">
                                {cardPartnerInfo.specificPartner ? "Partner específico" : "Partner"}
                              </Badge>
                            )}
                            <span
                              className="w-0 min-w-0 flex-1 truncate text-[10px] text-muted-foreground"
                              title={card.typeLine || "Criatura"}
                            >
                              {truncateTypeLine(card.typeLine || "Criatura")}
                            </span>
                            {resolvedCardMetadata[card.id]?.faces && resolvedCardMetadata[card.id]!.faces!.length > 1 && (
                              <DoubleFacePreview faces={resolvedCardMetadata[card.id]!.faces!} />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isCurrent ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() =>
                                handleSelect(card.cardName, card.cardScryfallId, card.imageUri || undefined)
                              }
                              className="h-7 px-2 text-xs"
                            >
                              Actual
                            </Button>
                            {cardPartnerInfo.hasPartner && !currentCommander?.includes(" // ") && (
                              <Button
                                size="sm"
                                variant="mana"
                                disabled={loading}
                                onClick={() =>
                                  handleSelect(card.cardName, card.cardScryfallId, card.imageUri || undefined, true)
                                }
                                className="h-7 px-2 text-xs gap-1"
                                title="Agregar un compañero a este comandante"
                              >
                                <Crown className="w-3 h-3" />
                                + Partner
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="mana"
                            disabled={loading}
                            onClick={() =>
                              handleSelect(card.cardName, card.cardScryfallId, card.imageUri || undefined)
                            }
                            className="h-7 px-2.5 text-xs"
                          >
                            Elegir
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              O escribe el nombre de cualquier comandante (en inglés):
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="ej: Niv-Mizzet, Parun / Aragorn, the Uniter"
                value={commanderInput}
                onChange={(e) => setCommanderInput(e.target.value)}
                className="border-border focus-visible:ring-ring text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSelect(commanderInput);
                  }
                }}
              />
              <Button
                variant="mana"
                disabled={loading || !commanderInput.trim()}
                onClick={() => handleSelect(commanderInput)}
                className="shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
