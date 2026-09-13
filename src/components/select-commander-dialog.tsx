"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { normalizeCardName } from "@/lib/card-utils";
import { setDeckCommander } from "@/actions/decks";
import { getCardNamed } from "@/actions/scryfall";

interface SelectCommanderDialogProps {
  deckId: string;
  deckName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckCards: DeckCardWithOwnership[];
  currentCommander?: string | null;
  onCommanderSelected: (commanderName: string, imageUri?: string) => void;
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
      className="inline-flex shrink-0 cursor-help text-amber-300"
      title="Carta transformable: ver ambas caras"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setOpen(false)}
    >
      <RotateCw className="h-3.5 w-3.5" />
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] flex gap-2 rounded-xl border border-amber-500/50 bg-slate-950 p-2 shadow-2xl shadow-black/80"
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
}: SelectCommanderDialogProps) {
  const [commanderInput, setCommanderInput] = useState(currentCommander || "");
  const [candidateFilter, setCandidateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerInput, setPartnerInput] = useState("");
  const [selectedCommander, setSelectedCommander] = useState<{ name: string; scryfallId?: string; imageUri?: string } | null>(null);
  const [partnerCandidateIds, setPartnerCandidateIds] = useState<Set<string>>(new Set());
  const [loadingPartnerCandidates, setLoadingPartnerCandidates] = useState(false);
  const [resolvedCardMetadata, setResolvedCardMetadata] = useState<
    Record<string, { typeLine?: string; imageUri?: string; faces?: string[] }>
  >({});

  useEffect(() => {
    if (!open || deckCards.length === 0) return;
    let cancelled = false;
    // Fetch card faces too: existing rows may already have type/image metadata
    // but still need Scryfall's face information for transform previews.
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

  // Commander eligibility is computed by the backend and shipped on every deck
  // card as `canBeCommander` (legendary creatures, legendary vehicles, and
  // legendary planeswalkers whose text reads "can be your commander"). The
  // type-line rule below is only a fallback for responses without the flag.
  const candidateCards = useMemo(() => {
    const candidates = cardsWithMetadata
      .filter((card) => !card.isSideboard)
      .filter((card) => card.canBeCommander ?? isCommanderCandidate(card.typeLine));

    // The same card can be present more than once: as the designated commander
    // row plus a regular copy, or as different printings of the same name.
    // The picker must list each distinct card only once, preferring the
    // commander-marked row when one exists.
    const byCardName = new Map<string, (typeof candidates)[number]>();
    for (const card of candidates) {
      const key = normalizeCardName(card.cardName);
      const existing = byCardName.get(key);
      if (!existing || (card.isCommander && !existing.isCommander)) {
        byCardName.set(key, card);
      }
    }

    return Array.from(byCardName.values()).sort((a, b) => {
      // Prioritize legendary creatures
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

  const partnerCandidates = useMemo(() => {
    const selectedName = selectedCommander?.name.toLowerCase();
    return candidateCards.filter((card) =>
      card.cardName.toLowerCase() !== selectedName && partnerCandidateIds.has(card.id)
    );
  }, [candidateCards, selectedCommander, partnerCandidateIds]);

  useEffect(() => {
    if (!selectedCommander) {
      setPartnerCandidateIds(new Set());
      return;
    }

    let cancelled = false;
    setLoadingPartnerCandidates(true);
    Promise.all(
      candidateCards
        .filter((card) =>
          card.cardName.toLowerCase() !== selectedCommander.name.toLowerCase() &&
          (card.typeLine || "").toLowerCase().includes("legendary") &&
          (card.typeLine || "").toLowerCase().includes("creature")
        )
        .map(async (card) => {
          const details = await getCardNamed(card.cardName);
          return details?.oracle_text?.toLowerCase().includes("partner") ? card.id : null;
        })
    ).then((ids) => {
      if (!cancelled) setPartnerCandidateIds(new Set(ids.filter((id): id is string => Boolean(id))));
    }).finally(() => {
      if (!cancelled) setLoadingPartnerCandidates(false);
    });

    return () => { cancelled = true; };
  }, [candidateCards, selectedCommander]);

  const handleSelect = async (name: string, scryfallId?: string, imageUri?: string) => {
    if (!name.trim()) {
      setError("Por favor, ingresa el nombre de un comandante");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const card = await getCardNamed(name.trim());
      const chosen = { name: name.trim(), scryfallId: scryfallId || card?.id, imageUri: imageUri || card?.image_uris?.normal };
      if (card?.oracle_text?.toLowerCase().includes("partner")) {
        setSelectedCommander(chosen);
        setPartnerInput("");
        return;
      }
      const res = await setDeckCommander(deckId, chosen.name, chosen.scryfallId, chosen.imageUri);
      onCommanderSelected(name.trim(), res.commanderImageUri || imageUri);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar el comandante");
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSave = async () => {
    if (!selectedCommander || !partnerInput.trim()) {
      setError("Selecciona o escribe un compañero para este comandante");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const card = await getCardNamed(partnerInput.trim());
      const partner = {
        name: partnerInput.trim(),
        scryfallId: card?.id,
        imageUri: card?.image_uris?.normal,
      };
      await setDeckCommander(
        deckId,
        selectedCommander.name,
        selectedCommander.scryfallId,
        selectedCommander.imageUri,
        partner
      );
      onCommanderSelected(`${selectedCommander.name} // ${partner.name}`, selectedCommander.imageUri);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar los comandantes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg min-w-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-300 text-xl">
            <Crown className="h-6 w-6 text-amber-400" />
            Asignar Comandante al Mazo
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Cada mazo debe tener un comandante asignado para consultar recomendaciones comunitarias de EDHREC y estadísticas de legalidad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {selectedCommander && (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                {selectedCommander.name} tiene Partner: selecciona su compañero
              </label>
              {loadingPartnerCandidates && (
                <p className="text-[11px] text-slate-400">Buscando criaturas legendarias con Partner...</p>
              )}
              {partnerCandidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-300">Compañeros encontrados en este mazo:</p>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {partnerCandidates.map((card) => (
                      <Button
                        key={card.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-between h-8 px-2 text-xs border-slate-700 hover:border-amber-400"
                        onClick={() => setPartnerInput(card.cardName)}
                        disabled={loading}
                      >
                        <span className="truncate">{card.cardName}</span>
                        <span className="ml-2 text-[10px] text-slate-400 shrink-0">Elegir</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {!loadingPartnerCandidates && partnerCandidates.length === 0 && (
                <p className="text-[11px] text-slate-400">No hay otra criatura legendaria con Partner en este mazo.</p>
              )}
              <Input
                placeholder="Nombre del comandante compañero"
                value={partnerInput}
                onChange={(e) => setPartnerInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handlePartnerSave(); } }}
                className="bg-slate-950 border-slate-700"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCommander(null)} disabled={loading}>Volver</Button>
                <Button variant="mana" size="sm" onClick={handlePartnerSave} disabled={loading || !partnerInput.trim()}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar pareja"}
                </Button>
              </div>
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
                <label className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Elegir de las cartas del mazo ({candidateCards.length})
                </label>
                {candidateCards.length > 6 && (
                  <div className="relative w-full min-w-0">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filtrar..."
                      value={candidateFilter}
                      onChange={(e) => setCandidateFilter(e.target.value)}
                      className="w-full h-7 pl-6 pr-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                    />
                  </div>
                )}
              </div>

              <div className="w-full min-w-0 max-h-48 overflow-x-hidden overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {filteredCandidates.map((card) => {
                  const isLegendary = (card.typeLine || "").toLowerCase().includes("legendary");
                  const isCurrent = currentCommander === card.cardName;

                  return (
                    <div
                      key={card.id}
                      className={`flex min-w-0 items-center justify-between p-2.5 rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-amber-500/10 border-amber-500/50"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
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
                              className="w-8 h-11 object-cover rounded border border-slate-700 shrink-0 cursor-pointer"
                            />
                          ) : (
                            <div className="w-8 h-11 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] text-slate-500 shrink-0">
                              MTG
                            </div>
                          )}
                        </CardPreviewHover>

                      <div className="min-w-0 flex-1 overflow-hidden">
                          <CardPreviewHover cardName={card.cardName} imageUri={card.imageUri}>
                            <span className="font-semibold text-xs text-slate-200 truncate cursor-pointer hover:text-amber-300 block">
                              {card.cardName}
                            </span>
                          </CardPreviewHover>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                            {isLegendary && (
                              <Badge variant="outline" className="shrink-0 text-[9px] px-1 py-0 bg-amber-500/10 text-amber-300 border-amber-500/30">
                                Legendaria
                              </Badge>
                            )}
                            <span
                              className="w-0 min-w-0 flex-1 truncate text-[10px] text-slate-400"
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

                      <Button
                        size="sm"
                        variant={isCurrent ? "outline" : "mana"}
                        disabled={loading}
                        onClick={() =>
                          handleSelect(card.cardName, card.cardScryfallId, card.imageUri || undefined)
                        }
                        className="h-7 px-2.5 text-xs shrink-0"
                      >
                        {isCurrent ? "Actual" : "Elegir"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual Input */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              O escribe el nombre de cualquier comandante (en inglés):
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="ej: Niv-Mizzet, Parun / Aragorn, the Uniter"
                value={commanderInput}
                onChange={(e) => setCommanderInput(e.target.value)}
                className="bg-slate-950 border-slate-700 focus:border-amber-400 text-sm"
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
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
