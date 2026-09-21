"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRightLeft,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";
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
import {
  getDecksOverlap,
  reassignCardToDeck,
  type DecksOverlapResponse,
  type DeckOverlapPair,
  type DeckOverlapSharedCard,
} from "@/actions/decks";

export function DeckOverlapView() {
  const [data, setData] = useState<DecksOverlapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPair, setSelectedPair] = useState<DeckOverlapPair | null>(null);
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  const loadOverlap = async () => {
    setIsLoading(true);
    try {
      const res = await getDecksOverlap();
      setData(res);
    } catch (err) {
      console.error("Error loading deck overlap:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverlap();
  }, []);

  // Map for fast matrix cell lookup: [idA_idB] -> DeckOverlapPair
  const pairMap = useMemo(() => {
    const map = new Map<string, DeckOverlapPair>();
    if (!data) return map;
    for (const p of data.pairs) {
      map.set(`${p.deckAId}_${p.deckBId}`, p);
      map.set(`${p.deckBId}_${p.deckAId}`, {
        ...p,
        deckAId: p.deckBId,
        deckAName: p.deckBName,
        deckBId: p.deckAId,
        deckBName: p.deckAName,
      });
    }
    return map;
  }, [data]);

  const handleReassign = async (
    targetCardId: string,
    sourceDeckId: string,
    cardName: string
  ) => {
    setIsReassigning(true);
    try {
      await reassignCardToDeck(sourceDeckId, targetCardId, cardName, 1);
      await loadOverlap();
      // Update selected pair if open
      if (selectedPair) {
        const updated = await getDecksOverlap();
        const p = updated.pairs.find(
          (x) =>
            (x.deckAId === selectedPair.deckAId && x.deckBId === selectedPair.deckBId) ||
            (x.deckAId === selectedPair.deckBId && x.deckBId === selectedPair.deckAId)
        );
        if (p) setSelectedPair(p);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error reasignando carta");
    } finally {
      setIsReassigning(false);
    }
  };

  const getHeatmapColor = (pct: number) => {
    if (pct === 0) return "bg-secondary/40 text-muted-foreground border-transparent";
    if (pct < 10) return "bg-indigo-950/40 text-indigo-300 border-indigo-900/50 hover:bg-indigo-900/60";
    if (pct < 20) return "bg-indigo-900/60 text-indigo-200 border-indigo-700/60 hover:bg-indigo-800/80";
    if (pct < 35) return "bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/70";
    return "bg-rose-950/70 text-rose-200 border-rose-700/70 hover:bg-rose-900/80 font-bold";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Calculando matriz de solapamiento...</p>
      </div>
    );
  }

  if (!data || data.decks.length < 2) {
    return (
      <div className="text-center py-16 rounded-xl border border-dashed border-border bg-card">
        <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-bold text-foreground">Necesitas al menos 2 mazos</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Crea o importa más mazos para visualizar qué cartas comparten y optimizar la asignación física de copias.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="p-5 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>Matriz de Solapamiento entre Mazos</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Muestra el porcentaje y número de cartas compartidas (excluyendo tierras básicas).
            Haz clic en cualquier celda para ver el desglose y reasignar copias directamente.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadOverlap}
          disabled={isLoading}
          className="h-8 text-xs border-border gap-1.5 shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Recalcular</span>
        </Button>
      </div>

      {/* Overlap Matrix */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto p-4 shadow-sm">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-muted-foreground font-semibold min-w-[140px]">
                Mazo
              </th>
              {data.decks.map((colDeck) => (
                <th
                  key={colDeck.id}
                  className="p-2 text-center text-foreground font-medium max-w-[110px] min-w-[90px] truncate"
                  title={colDeck.name}
                >
                  <div className="truncate">{colDeck.name}</div>
                  <div className="text-[10px] text-muted-foreground font-normal">
                    {colDeck.nonBasicCardsCount} cartas
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.decks.map((rowDeck) => (
              <tr key={rowDeck.id} className="border-t border-border/50">
                <td className="p-2 font-semibold text-foreground truncate max-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    {rowDeck.colors.length > 0 && (
                      <ColorIdentityPips colors={rowDeck.colors} size="xs" />
                    )}
                    <span className="truncate">{rowDeck.name}</span>
                  </div>
                </td>

                {data.decks.map((colDeck) => {
                  if (rowDeck.id === colDeck.id) {
                    return (
                      <td
                        key={colDeck.id}
                        className="p-2 text-center text-muted-foreground/30 font-mono bg-secondary/20"
                      >
                        —
                      </td>
                    );
                  }

                  const pair = pairMap.get(`${rowDeck.id}_${colDeck.id}`);
                  const pct = pair?.overlapPercentage ?? 0;
                  const count = pair?.sharedCount ?? 0;

                  return (
                    <td key={colDeck.id} className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => pair && setSelectedPair(pair)}
                        className={`w-full py-2 px-1 rounded border transition-all cursor-pointer ${getHeatmapColor(
                          pct
                        )}`}
                        title={`Ver ${count} cartas compartidas entre ${rowDeck.name} y ${colDeck.name}`}
                      >
                        <div className="font-mono font-bold text-xs">{pct}%</div>
                        <div className="text-[10px] opacity-80">{count} cartas</div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Dialog for Selected Pair */}
      {selectedPair && (
        <Dialog
          open={Boolean(selectedPair)}
          onOpenChange={(open) => !open && setSelectedPair(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span>
                  Solapamiento: {selectedPair.deckAName} ↔ {selectedPair.deckBName}
                </span>
              </DialogTitle>
              <DialogDescription>
                Comparten {selectedPair.sharedCount} cartas ({selectedPair.overlapPercentage}% de similitud). Puedes reasignar copias directamente entre ambos mazos.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto flex-1 divide-y divide-border pr-1 space-y-1">
              {selectedPair.sharedCards.map((card) => {
                const aHasAssigned = card.deckAAssigned > 0;
                const bNeeds = card.deckBQuantity > card.deckBAssigned;
                const bHasAssigned = card.deckBAssigned > 0;
                const aNeeds = card.deckAQuantity > card.deckAAssigned;

                return (
                  <div
                    key={card.cardScryfallId}
                    className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-14 rounded overflow-hidden border border-border shrink-0 bg-background">
                        {card.imageUri ? (
                          <Image
                            src={card.imageUri}
                            alt={card.cardName}
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
                        <CardPreviewHover
                          cardName={card.cardName}
                          imageUri={card.imageUri}
                        >
                          <h4 className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-xs">
                            {card.cardName}
                          </h4>
                        </CardPreviewHover>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="truncate max-w-[140px]">
                            {card.typeLine || "Carta"}
                          </span>
                          <ManaCost manaCost={card.manaCost} />
                        </div>

                        {/* Status in both decks */}
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono">
                          <span
                            className={
                              card.deckAAssigned >= card.deckAQuantity
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {selectedPair.deckAName}: {card.deckAAssigned}/{card.deckAQuantity}
                          </span>
                          <span className="text-muted-foreground">|</span>
                          <span
                            className={
                              card.deckBAssigned >= card.deckBQuantity
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            {selectedPair.deckBName}: {card.deckBAssigned}/{card.deckBQuantity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reassignment Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {aHasAssigned && bNeeds && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isReassigning}
                          onClick={() =>
                            handleReassign(
                              card.deckBCardId,
                              selectedPair.deckAId,
                              card.cardName
                            )
                          }
                          className="h-7 text-xs text-indigo-300 bg-indigo-950/40 border-indigo-700/60 hover:bg-indigo-900/60 gap-1"
                          title={`Mover 1 copia de ${selectedPair.deckAName} a ${selectedPair.deckBName}`}
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Mover a {selectedPair.deckBName.slice(0, 10)}</span>
                        </Button>
                      )}

                      {bHasAssigned && aNeeds && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isReassigning}
                          onClick={() =>
                            handleReassign(
                              card.deckACardId,
                              selectedPair.deckBId,
                              card.cardName
                            )
                          }
                          className="h-7 text-xs text-indigo-300 bg-indigo-950/40 border-indigo-700/60 hover:bg-indigo-900/60 gap-1"
                          title={`Mover 1 copia de ${selectedPair.deckBName} a ${selectedPair.deckAName}`}
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Mover a {selectedPair.deckAName.slice(0, 10)}</span>
                        </Button>
                      )}
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
