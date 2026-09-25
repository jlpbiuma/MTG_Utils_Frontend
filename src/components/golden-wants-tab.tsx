"use client";

import React, { useState, useMemo, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Sparkles,
  Trophy,
  Coins,
  ArrowRight,
  TrendingUp,
  ShoppingCart,
  Copy,
  Check,
  Target,
  Layers,
  ExternalLink,
  Heart,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { PriceSparkline } from "@/components/price-sparkline";
import { ManaCost } from "@/components/mana-cost";
import { CardImage as Image } from "@/components/card-image";
import { addOrIncrementWant } from "@/actions/wants";
import { copyText } from "@/lib/copy-text";
import { formatPrice } from "@/lib/deck-colors";
import type { PriorityItem } from "@/actions/priorities";
import {
  solveGoldenWants,
  type GoldenWantsStrategy,
  type GoldenWantsCartItem,
  type PriceOpportunityFilter,
  comparePriceOpportunities,
} from "@/lib/golden-wants-solver";

interface GoldenWantsTabProps {
  items: PriorityItem[];
  currencySymbol?: string;
  priceWindowDays?: number;
  globalDeckCount?: number;
  globalCompletionBefore?: number;
  onCardSelect: (card: PriorityItem) => void;
  onDecksSelect: (card: PriorityItem) => void;
}

export function GoldenWantsTab({
  items,
  currencySymbol = "€",
  onCardSelect,
  onDecksSelect,
  priceWindowDays = 30,
  globalDeckCount,
  globalCompletionBefore,
}: GoldenWantsTabProps) {
  const router = useRouter();
  const [isChangingPeriod, startPeriodTransition] = useTransition();
  const [budgetInput, setBudgetInput] = useState<string>("50");
  const [strategy, setStrategy] = useState<GoldenWantsStrategy>("complete_decks");
  const [priceFilter, setPriceFilter] = useState<PriceOpportunityFilter>("all");
  const [opportunitySort, setOpportunitySort] = useState(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [omittedIds, setOmittedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingWants, setAddingWants] = useState(false);
  const wantsBusy = useRef(false);
  const [actionMessage, setActionMessage] = useState("");
  const [copyFallback, setCopyFallback] = useState<string | null>(null);

  const budget = parseFloat(budgetInput) || 0;

  const result = useMemo(() => {
    return solveGoldenWants(items, budget, strategy, priceFilter, omittedIds);
  }, [items, budget, strategy, priceFilter, omittedIds]);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.cardScryfallId, item])), [items]);

  const sortedCart = useMemo(() => {
    if (!opportunitySort) return result.cart;
    return [...result.cart].sort((a, b) => comparePriceOpportunities(itemsById.get(a.cardScryfallId)!, itemsById.get(b.cardScryfallId)!));
  }, [itemsById, result.cart, opportunitySort]);

  const improvedDecks = result.projectedProgress.filter(
    (deck) => deck.cardsFulfilled > 0 && deck.after > deck.before
  );

  const globalProgress = useMemo(() => {
    const decks = new Map(items.flatMap((item) => item.decks.map((deck) => [deck.deckId, deck.completionPercentage] as const)));
    const count = globalDeckCount ?? decks.size;
    const before = globalCompletionBefore ?? (count ? [...decks.values()].reduce((sum, value) => sum + value, 0) / count : 0);
    const gain = count ? result.projectedProgress.reduce((sum, deck) => sum + (deck.cardsFulfilled > 0 ? Math.max(0, deck.after - deck.before) : 0), 0) / count : 0;
    return { before, after: Math.min(100, before + gain), gain, count };
  }, [items, globalDeckCount, globalCompletionBefore, result.projectedProgress]);

  const fallingChecked = priceFilter === "falling" || priceFilter === "opportunities";
  const lowChecked = priceFilter === "historical_low" || priceFilter === "opportunities";
  const setPriceChecks = (falling: boolean, low: boolean) => setPriceFilter(
    falling && low ? "opportunities" : falling ? "falling" : low ? "historical_low" : "all"
  );

  const handleCopyList = async () => {
    if (sortedCart.length === 0) return;
    const text = sortedCart.map((card) => `${card.quantityToBuy} ${card.cardName}`).join("\n");
    setCopied(false);
    setCopyFallback(null);
    try {
      await copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFallback(text);
    }
  };

  const handleAddWants = async (cards: GoldenWantsCartItem[]) => {
    if (wantsBusy.current) return;
    wantsBusy.current = true;
    setAddingWants(true);
    setActionMessage("");
    const pending = cards.filter((card) => !addedIds.has(card.cardScryfallId));
    let succeeded = 0;
    let failed = 0;
    try {
      for (const card of pending) {
        try {
          await addOrIncrementWant({
            cardScryfallId: card.cardScryfallId,
            cardName: card.cardName,
            quantity: card.quantityToBuy,
            imageUri: card.imageUri,
            manaCost: card.manaCost,
            typeLine: card.typeLine,
          });
          succeeded++;
          setAddedIds((previous) => new Set(previous).add(card.cardScryfallId));
          setActionMessage(`Añadiendo a Wants: ${succeeded + failed}/${pending.length}`);
        } catch {
          failed++;
        }
      }
      setActionMessage(failed
        ? `${succeeded} añadidas; ${failed} no se pudieron añadir. Puedes reintentar las pendientes.`
        : `${succeeded} cartas añadidas a Wants.`);
    } finally {
      wantsBusy.current = false;
      setAddingWants(false);
    }
  };

  return (
    <div className="space-y-8">
      <section aria-label="Configurar compra" className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">¿Cuánto quieres invertir hoy?</h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
            <Sparkles className="h-3.5 w-3.5" /> Golden Wants
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_160px] gap-5 items-start">
          <div className="space-y-2">
            <label htmlFor="purchase-budget" className="block text-xs font-medium text-muted-foreground">Presupuesto</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-32 shrink-0">
                <Input id="purchase-budget" type="number" min="0" step="5" value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="h-11 pr-8 font-mono font-bold text-base bg-background"
                />
                <span className="absolute right-3 top-3 text-sm text-muted-foreground">{currencySymbol}</span>
              </div>
              <div className="flex gap-1">
                {[20, 50, 100].map((preset) => (
                  <Button key={preset} type="button" size="sm" variant="outline"
                    onClick={() => setBudgetInput(String(preset))}
                    aria-pressed={budget === preset}
                    className={`h-11 px-2.5 text-xs font-mono ${budget === preset ? "border-amber-400/60 text-amber-300 bg-amber-500/10" : "text-muted-foreground"}`}
                  >{preset}{currencySymbol}</Button>
                ))}
              </div>
            </div>
          </div>

          <fieldset className="space-y-2 min-w-0">
            <legend className="text-xs font-medium text-muted-foreground">Estrategia</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-1">
              <button type="button" onClick={() => setStrategy("complete_decks")}
                aria-label="Cerrar Mazos al 100%" aria-pressed={strategy === "complete_decks"}
                className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${strategy === "complete_decks" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              ><Trophy className="h-3.5 w-3.5 shrink-0" /><span>Mazos al 100%</span></button>
              <button type="button" onClick={() => setStrategy("max_completion")}
                aria-pressed={strategy === "max_completion"}
                className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${strategy === "max_completion" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              ><TrendingUp className="h-3.5 w-3.5 shrink-0" /><span>Max % Global</span></button>
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="price-period" className="block text-xs font-medium text-muted-foreground">Período</label>
            <select id="price-period" aria-label="Período de precios" value={priceWindowDays} disabled={isChangingPeriod}
              onChange={(e) => {
                const period = Number(e.target.value);
                startPeriodTransition(() => router.replace(`/priorities/golden-wants?period=${period}`, { scroll: false }));
              }}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {[7, 30, 90, 180, 365].map((days) => <option key={days} value={days}>{days} días</option>)}
            </select>
            {isChangingPeriod && <p role="status" className="text-xs text-muted-foreground">Actualizando…</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-4">
          <fieldset className="flex flex-wrap items-center gap-2" aria-label="Seleccionar cartas por precio">
            <span aria-hidden="true" className="mr-1 text-xs font-medium text-muted-foreground">Precio</span>
            <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${fallingChecked ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <input type="checkbox" aria-label="En tendencia a la baja" className="h-3.5 w-3.5 accent-emerald-500" checked={fallingChecked} onChange={(e) => setPriceChecks(e.target.checked, lowChecked)} />
              A la baja
            </label>
            <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs transition-colors ${lowChecked ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <input type="checkbox" aria-label="En mínimo histórico" className="h-3.5 w-3.5 accent-amber-500" checked={lowChecked} onChange={(e) => setPriceChecks(fallingChecked, e.target.checked)} />
              Mínimo histórico
            </label>
          </fieldset>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-xs text-muted-foreground sm:ml-auto">
            <input type="checkbox" aria-label="Ordenar compra por oportunidad de precio" className="h-3.5 w-3.5 accent-amber-500" checked={opportunitySort} onChange={(e) => setOpportunitySort(e.target.checked)} />
            Mejores oportunidades primero
          </label>
        </div>
      </section>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
        <div className="p-4 rounded-xl border border-primary/30 bg-card col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground">Incremento Global de Completitud</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">+{globalProgress.gain.toFixed(2)} pp</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {globalProgress.before.toFixed(2)}% → {globalProgress.after.toFixed(2)}% · media de {globalProgress.count} mazos
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
      {improvedDecks.length > 0 && (
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

          <Tooltip.Provider delayDuration={200}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {improvedDecks.map((p) => (
                <div
                  key={p.deckId}
                  className="p-3 rounded-lg border border-border bg-background space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {p.deckName}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground">{Number(p.before.toFixed(1))}%</span>
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
                        {Number(p.after.toFixed(1))}%
                      </span>
                      {p.gainedPercentage > 0 && (
                        <span className="text-[10px] text-emerald-400 font-semibold">
                          (+{Number(p.gainedPercentage.toFixed(1))}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`Cartas que mejoran ${p.deckName}`}
                        className="flex w-full items-center min-h-6 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="w-full bg-secondary h-2.5 rounded-full overflow-hidden flex">
                          <span
                            style={{ width: `${Math.min(100, p.before)}%` }}
                            className="bg-primary/80 h-full transition-all"
                          />
                          <span
                            style={{ width: `${Math.min(100 - p.before, p.gainedPercentage)}%` }}
                            className="bg-emerald-400 h-full transition-all motion-safe:animate-pulse"
                          />
                        </span>
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="top"
                        sideOffset={6}
                        collisionPadding={12}
                        className="z-50 max-w-[calc(100vw-24px)] rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
                      >
                        <ul className="space-y-2">
                          {result.cart
                            .filter((card) => card.targetDecks.some((deck) => deck.deckId === p.deckId))
                            .map((card) => (
                              <li key={card.cardScryfallId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold">{card.cardName}</span>
                                <span>· {card.typeLine || "Tipo desconocido"} ·</span>
                                <span aria-label={`Coste de maná: ${card.manaCost || "Sin coste de maná"}`}>
                                  {card.manaCost ? <ManaCost manaCost={card.manaCost} /> : "Sin coste de maná"}
                                </span>
                                <span className="font-mono">· {formatPrice(card.unitPrice, currencySymbol)}</span>
                              </li>
                            ))}
                        </ul>
                        <Tooltip.Arrow className="fill-popover" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <p className="text-[10px] text-muted-foreground">
                    +{p.cardsFulfilled} cartas añadidas de {p.totalMissingInitially} faltantes
                  </p>
                </div>
              ))}
            </div>
          </Tooltip.Provider>
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

          <div className="flex flex-wrap items-center gap-2">
            {omittedIds.size > 0 && <Button size="sm" variant="ghost" disabled={addingWants} onClick={() => setOmittedIds(new Set())}>
              Restaurar omitidas ({omittedIds.size})
            </Button>}
            <Button size="sm" variant="outline"
              disabled={addingWants || !sortedCart.some((card) => !addedIds.has(card.cardScryfallId))}
              onClick={() => handleAddWants(sortedCart)} className="gap-2 text-xs">
              {addingWants ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
              Añadir todas a Wants
            </Button>
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
        </div>
        {actionMessage && <p role="status" className="text-xs text-muted-foreground">{actionMessage}</p>}
        {copyFallback !== null && <div className="space-y-2">
          <label htmlFor="copy-list-fallback" className="text-xs text-muted-foreground">No se pudo copiar automáticamente. Selecciona y copia el listado:</label>
          <textarea id="copy-list-fallback" readOnly value={copyFallback} onFocus={(e) => e.currentTarget.select()}
            className="w-full h-32 rounded-md border border-border bg-background p-3 text-xs font-mono" />
        </div>}

        {result.cart.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-border bg-card/40">
            <Coins className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold text-foreground">
              Sin cartas seleccionables con este presupuesto y filtros
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Prueba otro filtro de precio, aumenta el presupuesto o revisa si tus mazos ya están completos.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {sortedCart.map((card) => (
              <div
                key={card.cardScryfallId}
                className="px-3 py-3 sm:px-4 grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto] gap-x-5 gap-y-2 items-center hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    aria-label={`Ver imagen y detalles de ${card.cardName}`}
                    onClick={() => onCardSelect(itemsById.get(card.cardScryfallId)!)}
                    className="relative w-11 h-15 rounded overflow-hidden border border-border shrink-0 bg-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
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
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <CardPreviewHover
                      cardName={card.cardName}
                      imageUri={card.imageUri}
                      className="max-w-full"
                    >
                      <button
                        type="button"
                        aria-label={`Ver detalles de ${card.cardName}`}
                        onClick={() => onCardSelect(itemsById.get(card.cardScryfallId)!)}
                        className="block text-left rounded font-semibold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {card.quantityToBuy}x {card.cardName}
                      </button>
                    </CardPreviewHover>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="truncate max-w-[150px]">
                        {card.typeLine || "Carta"}
                      </span>
                      <ManaCost manaCost={card.manaCost} />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <button
                        type="button"
                        aria-label={`Ver mazos que piden ${card.cardName}`}
                        onClick={() => onDecksSelect(itemsById.get(card.cardScryfallId)!)}
                        className="inline-flex min-h-7 items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 text-foreground hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Layers className="h-3 w-3" />
                        {itemsById.get(card.cardScryfallId)!.numDecks} mazos
                      </button>
                      {itemsById.get(card.cardScryfallId)?.historicalLow != null && (
                        <span className="text-muted-foreground">
                          Mín. {formatPrice(itemsById.get(card.cardScryfallId)!.historicalLow, currencySymbol)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 min-w-0 order-3 md:col-span-1 md:order-2">
                  <PriceSparkline
                    points={itemsById.get(card.cardScryfallId)?.priceHistory}
                    windowDays={priceWindowDays}
                    cardName={card.cardName}
                    currencySymbol={currencySymbol}
                    onOpen={() => onCardSelect(itemsById.get(card.cardScryfallId)!)}
                  />
                </div>
                <div className="order-2 md:order-3 flex flex-col items-end gap-2">
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

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                      title={addedIds.has(card.cardScryfallId) ? "Añadida a Wants" : "Añadir a Wants"}
                      aria-label={`Añadir ${card.cardName} a Wants`}
                      disabled={addingWants || addedIds.has(card.cardScryfallId)}
                      onClick={() => handleAddWants([card])}>
                      {addedIds.has(card.cardScryfallId) ? <Check className="h-4 w-4 text-emerald-400" /> : <Heart className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Omitir carta"
                      aria-label={`Omitir ${card.cardName}`} disabled={addingWants}
                      onClick={() => { setOmittedIds((previous) => new Set(previous).add(card.cardScryfallId)); setCopied(false); setCopyFallback(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
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
