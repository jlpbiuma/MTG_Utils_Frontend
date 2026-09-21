"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RotateCcw,
  Sparkles,
  Play,
  ArrowRight,
  Layers,
  ChevronRight,
  Shuffle,
  HelpCircle,
} from "lucide-react";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import type { DeckCardWithOwnership } from "@/lib/schemas";
import { getCardCategory, isBasicLand } from "@/lib/card-utils";

interface DeckMulliganSimulatorProps {
  cards: DeckCardWithOwnership[];
  commanderName?: string | null;
}

interface SimCard {
  uid: string;
  cardName: string;
  cardScryfallId: string;
  imageUri?: string | null;
  manaCost?: string | null;
  typeLine?: string | null;
  isLand: boolean;
}

export function DeckMulliganSimulator({ cards, commanderName }: DeckMulliganSimulatorProps) {
  // Flatten deck cards into individual copies, excluding commander and sideboard
  const pool = useMemo(() => {
    const list: SimCard[] = [];
    let counter = 0;
    for (const c of cards) {
      if (c.isSideboard || c.isCommander) continue;
      const isLand = getCardCategory(c.typeLine, c.cardName) === "lands" || isBasicLand(c.typeLine, c.cardName);
      const qty = c.quantity || 1;
      for (let i = 0; i < qty; i++) {
        list.push({
          uid: `${c.id}_${i}_${counter++}`,
          cardName: c.cardName,
          cardScryfallId: c.cardScryfallId,
          imageUri: c.imageUri,
          manaCost: c.manaCost,
          typeLine: c.typeLine,
          isLand,
        });
      }
    }
    return list;
  }, [cards]);

  // Game state
  const [library, setLibrary] = useState<SimCard[]>([]);
  const [hand, setHand] = useState<SimCard[]>([]);
  const [mulliganCount, setMulliganCount] = useState<number>(0);
  const [cardsToBottom, setCardsToBottom] = useState<string[]>([]);
  const [turn, setTurn] = useState<number>(1);

  // Fisher-Yates shuffle
  const shuffle = useCallback((deckList: SimCard[]): SimCard[] => {
    const arr = [...deckList];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const startNewHand = useCallback(() => {
    const shuffled = shuffle(pool);
    const openingHand = shuffled.slice(0, 7);
    const remainingLibrary = shuffled.slice(7);
    setHand(openingHand);
    setLibrary(remainingLibrary);
    setMulliganCount(0);
    setCardsToBottom([]);
    setTurn(1);
  }, [pool, shuffle]);

  useEffect(() => {
    if (pool.length > 0) {
      startNewHand();
    }
  }, [pool, startNewHand]);

  const handleLondonMulligan = () => {
    const newMulliganCount = mulliganCount + 1;
    const shuffled = shuffle(pool);
    const newHand = shuffled.slice(0, 7);
    const remainingLibrary = shuffled.slice(7);
    setHand(newHand);
    setLibrary(remainingLibrary);
    setMulliganCount(newMulliganCount);
    setCardsToBottom([]);
    setTurn(1);
  };

  const toggleBottomCard = (uid: string) => {
    if (cardsToBottom.includes(uid)) {
      setCardsToBottom(cardsToBottom.filter((id) => id !== uid));
    } else {
      if (cardsToBottom.length < mulliganCount) {
        setCardsToBottom([...cardsToBottom, uid]);
      }
    }
  };

  const confirmBottomCards = () => {
    const bottomCards = hand.filter((c) => cardsToBottom.includes(c.uid));
    const keptHand = hand.filter((c) => !cardsToBottom.includes(c.uid));
    setHand(keptHand);
    setLibrary([...library, ...bottomCards]);
    setCardsToBottom([]);
  };

  const handleNextTurn = () => {
    if (library.length === 0) return;
    const drawn = library[0];
    setHand([...hand, drawn]);
    setLibrary(library.slice(1));
    setTurn(turn + 1);
  };

  // Metrics on hand
  const landsInHand = hand.filter((c) => c.isLand).length;
  const spellsInHand = hand.length - landsInHand;
  const needsBottomChoice = mulliganCount > 0 && cardsToBottom.length < mulliganCount && hand.length > (7 - mulliganCount);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-5 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-primary" />
            <span>Simulador de Apertura de Mano (Mulligan de Londres)</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Simula manos iniciales y turnos de juego de tu mazo actual ({pool.length} cartas en biblioteca).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={startNewHand}
            className="h-8 text-xs gap-1.5 border-border"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Nueva Mano (Reset)</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLondonMulligan}
            className="h-8 text-xs gap-1.5 border-border text-amber-300 bg-amber-950/20 hover:bg-amber-950/40"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>Mulligan ({mulliganCount + 1})</span>
          </Button>

          <Button
            size="sm"
            onClick={handleNextTurn}
            disabled={library.length === 0}
            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Avanzar Turno (T{turn + 1})</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Turno Actual</p>
          <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
            Turno {turn}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {turn === 1 ? "Mano inicial" : `${turn - 1} robos realizados`}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Tierras en Mano</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
            {landsInHand} / {hand.length}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {Math.round((landsInHand / Math.max(1, hand.length)) * 100)}% de la mano
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Hechizos en Mano</p>
          <p className="text-2xl font-bold font-mono text-primary mt-0.5">
            {spellsInHand}
          </p>
          <p className="text-[11px] text-muted-foreground">Cartas no tierra</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Cartas en Biblioteca</p>
          <p className="text-2xl font-bold font-mono text-muted-foreground mt-0.5">
            {library.length}
          </p>
          <p className="text-[11px] text-muted-foreground">Restantes por robar</p>
        </div>
      </div>

      {/* London Mulligan Banner if pending cards to bottom */}
      {mulliganCount > 0 && hand.length > 7 - mulliganCount && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="font-bold text-amber-300 text-sm">
              Regla de Londres: Elige {mulliganCount} {mulliganCount === 1 ? "carta" : "cartas"} para poner al fondo de tu biblioteca.
            </h4>
            <p className="text-xs text-amber-200/70">
              Seleccionadas: {cardsToBottom.length} de {mulliganCount}. Haz clic en las cartas para marcarlas.
            </p>
          </div>

          <Button
            size="sm"
            disabled={cardsToBottom.length !== mulliganCount}
            onClick={confirmBottomCards}
            className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-amber-950"
          >
            Confirmar ({cardsToBottom.length}/{mulliganCount})
          </Button>
        </div>
      )}

      {/* Hand Cards Grid */}
      <div className="space-y-3">
        <h4 className="font-bold text-sm text-foreground flex items-center justify-between">
          <span>Tu Mano ({hand.length} cartas):</span>
          <span className="text-xs text-muted-foreground font-normal">
            Pasa el cursor para ver el arte y detalles completos
          </span>
        </h4>

        {hand.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Mano vacía</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {hand.map((card) => {
              const isSelectedToBottom = cardsToBottom.includes(card.uid);

              return (
                <div
                  key={card.uid}
                  onClick={() => {
                    if (mulliganCount > 0 && hand.length > 7 - mulliganCount) {
                      toggleBottomCard(card.uid);
                    }
                  }}
                  className={`group relative rounded-xl border bg-card p-2.5 flex flex-col justify-between transition-all ${
                    isSelectedToBottom
                      ? "border-amber-500 ring-2 ring-amber-500/50 opacity-60 scale-95"
                      : "border-border hover:border-primary/60 hover:shadow-md"
                  } ${
                    mulliganCount > 0 && hand.length > 7 - mulliganCount
                      ? "cursor-pointer"
                      : ""
                  }`}
                >
                  <div>
                    {/* Card Thumbnail */}
                    <div className="relative aspect-[5/7] rounded-lg overflow-hidden border border-border bg-background mb-2">
                      {card.imageUri ? (
                        <Image
                          src={card.imageUri}
                          alt={card.cardName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                          MTG
                        </div>
                      )}

                      {/* Tag: Land vs Spell */}
                      <div className="absolute top-1 left-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow ${
                            card.isLand
                              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-700/60"
                              : "bg-indigo-950/90 text-indigo-300 border border-indigo-700/60"
                          }`}
                        >
                          {card.isLand ? "Tierra" : "Hechizo"}
                        </span>
                      </div>

                      {/* Selection overlay for bottoming */}
                      {isSelectedToBottom && (
                        <div className="absolute inset-0 bg-amber-950/80 flex items-center justify-center">
                          <span className="text-xs font-bold text-amber-300 bg-amber-900/80 px-2 py-1 rounded">
                            Al fondo
                          </span>
                        </div>
                      )}
                    </div>

                    <CardPreviewHover
                      cardName={card.cardName}
                      imageUri={card.imageUri}
                    >
                      <h5 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate cursor-pointer">
                        {card.cardName}
                      </h5>
                    </CardPreviewHover>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[80px]">
                        {card.typeLine || "Card"}
                      </span>
                      <ManaCost manaCost={card.manaCost} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
