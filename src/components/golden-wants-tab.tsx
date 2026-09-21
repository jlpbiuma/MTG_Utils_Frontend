"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Trophy,
  Coins,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  Copy,
  Check,
  Zap,
  Target,
  Layers,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import { CardImage as Image } from "@/components/card-image";
import { formatPrice } from "@/lib/deck-colors";
import type { PriorityItem } from "@/actions/priorities";
import {
  solveGoldenWants,
  type GoldenWantsStrategy,
} from "@/lib/golden-wants-solver";

interface GoldenWantsTabProps {
  items: PriorityItem[];
  currencySymbol?: string;
}

export function GoldenWantsTab({
  items,
  currencySymbol = "€",
}: GoldenWantsTabProps) {
  const [budgetInput, setBudgetInput] = useState<string>("50");
  const [strategy, setStrategy] = useState<GoldenWantsStrategy>("complete_decks");
  const [copied, setCopied] = useState<boolean>(false);

  const budget = parseFloat(budgetInput) || 0;

  const result = useMemo(() => {
    return solveGoldenWants(items, budget, strategy);
  }, [items, budget, strategy]);

  const handleCopyList = () => {
    if (result.cart.length === 0) return;
    const text = result.cart
      .map((c) => `${c.quantityToBuy} ${c.cardName}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Optimizer Header Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-amber-950/20 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Optimizador de Presupuesto (Golden Wants)</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              ¿Cuánto quieres invertir hoy?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El algoritmo resuelve el problema de la mochila (Knapsack) para
              calcular la combinación matemática óptima de cartas a adquirir.
            </p>
          </div>

          {/* Controls: Budget + Strategy */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-4 bg-background/80 p-4 rounded-xl border border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Presupuesto disponible:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  <Input
                    type="number"
                    min="1"
                    step="5"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="pr-7 font-mono font-bold text-base"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground font-mono font-bold">
                    {currencySymbol}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[20, 50, 100].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setBudgetInput(String(preset))}
                      className={`h-9 px-2 text-xs font-mono ${
                        budget === preset
                          ? "border-amber-400 text-amber-300 bg-amber-950/40"
                          : ""
                      }`}
                    >
                      {preset}
                      {currencySymbol}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategy selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Estrategia de compra:
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-secondary p-1 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setStrategy("complete_decks")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    strategy === "complete_decks"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>Cerrar Mazos al 100%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy("max_completion")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    strategy === "max_completion"
                      ? "bg-foreground text-background shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Max % Global</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Gasto Proyectado</p>
          <p className="text-2xl font-bold font-mono text-foreground mt-1">
            {formatPrice(result.totalCost, currencySymbol)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            de {formatPrice(budget, currencySymbol)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Presupuesto Restante</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {formatPrice(result.budgetRemaining, currencySymbol)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Sobrante no asignado
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Cartas Seleccionadas</p>
          <p className="text-2xl font-bold font-mono text-primary mt-1">
            {result.totalCardsToBuy}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {result.cart.length} títulos distintos
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-xs text-muted-foreground">Mazos Completables</p>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {result.completedDecks.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            alcanzarían el 100%
          </p>
        </div>
      </div>

      {/* Celebration Banner if Decks Completed */}
      {result.completedDecks.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-4">
          <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-amber-300 text-sm">
              ¡{result.completedDecks.length}{" "}
              {result.completedDecks.length === 1 ? "mazo alcanzará" : "mazos alcanzarán"} el
              100% de cartas en mano!
            </h4>
            <p className="text-xs text-amber-200/80">
              {result.completedDecks.map((d) => d.deckName).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Projected Deck Progress Bars */}
      {result.projectedProgress.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Impacto Proyectado en tus Mazos</span>
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Progreso antes → después
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.projectedProgress.map((p) => (
              <div
                key={p.deckId}
                className="p-3 rounded-lg border border-border bg-background space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate max-w-[200px]">
                    {p.deckName}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-muted-foreground">{p.before}%</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={`font-bold ${
                        p.after >= 100
                          ? "text-amber-400"
                          : p.gainedPercentage > 0
                          ? "text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {p.after}%
                    </span>
                    {p.gainedPercentage > 0 && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        (+{p.gainedPercentage}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Split Progress Bar */}
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, p.before)}%` }}
                    className="bg-primary/80 h-full transition-all"
                    title={`En mano previo: ${p.before}%`}
                  />
                  <div
                    style={{
                      width: `${Math.min(100 - p.before, p.gainedPercentage)}%`,
                    }}
                    className="bg-emerald-400 h-full transition-all animate-pulse"
                    title={`Ganancia con compra: +${p.gainedPercentage}%`}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  +{p.cardsFulfilled} cartas añadidas de {p.totalMissingInitially} faltantes
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Items List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span>Cesta de Compra Optimizada ({result.cart.length} cartas)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lista calculada para maximizar el valor de tu presupuesto.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyList}
            disabled={result.cart.length === 0}
            className="gap-2 text-xs border-border self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>¡Copiada al portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Copiar Lista en Texto</span>
              </>
            )}
          </Button>
        </div>

        {result.cart.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/40">
            <Coins className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground">
              Sin cartas seleccionables para este presupuesto
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Aumenta el presupuesto disponible o revisa si tus mazos ya están
              100% completados.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {result.cart.map((card) => (
              <div
                key={card.cardScryfallId}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-11 h-15 rounded overflow-hidden border border-border shrink-0 bg-background">
                    {card.imageUri ? (
                      <Image
                        src={card.imageUri}
                        alt={card.cardName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                        MTG
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <CardPreviewHover
                      cardName={card.cardName}
                      imageUri={card.imageUri}
                    >
                      <h4 className="font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-xs sm:max-w-md">
                        {card.quantityToBuy}x {card.cardName}
                      </h4>
                    </CardPreviewHover>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate max-w-[150px]">
                        {card.typeLine || "Carta"}
                      </span>
                      <ManaCost manaCost={card.manaCost} />
                    </div>

                    {/* Benefited Decks */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {card.targetDecks.map((d) => (
                        <span
                          key={d.deckId}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary border border-border text-foreground"
                        >
                          <Layers className="h-2.5 w-2.5 text-primary" />
                          <span className="truncate max-w-[120px]">
                            {d.deckName}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right font-mono">
                    <span className="text-base font-bold text-foreground">
                      {formatPrice(card.totalCost, currencySymbol)}
                    </span>
                    {card.quantityToBuy > 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        {card.quantityToBuy} × {formatPrice(card.unitPrice, currencySymbol)}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="h-8 px-2.5 text-xs gap-1.5 border-primary/30 hover:border-primary/60 hover:bg-primary/10 text-primary"
                    title={`Buscar ${card.cardName} en Cardmarket`}
                  >
                    <a
                      href={`https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(
                        card.cardName
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Cardmarket</span>
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
