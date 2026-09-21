"use client";

import React, { useState, useEffect } from "react";
import {
  Moon,
  Coins,
  Copy,
  Check,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { CardImage as Image } from "@/components/card-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManaCost } from "@/components/mana-cost";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { getDormantCards, type DormantCardItem, type DormantCardsResponse } from "@/actions/collection";
import type { PriceProvider } from "@/lib/pricing/types";
import { formatPrice } from "@/lib/deck-colors";

interface DormantCardsTabProps {
  provider: PriceProvider;
}

export function DormantCardsTab({ provider }: DormantCardsTabProps) {
  const [data, setData] = useState<DormantCardsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<DormantCardItem | null>(null);

  const loadDormant = async () => {
    setIsLoading(true);
    try {
      const res = await getDormantCards({ minPrice, provider });
      setData(res);
    } catch (err) {
      console.error("Error loading dormant cards:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDormant();
  }, [provider, minPrice]);

  const cards = data?.cards || [];
  const symbol = data?.currencySymbol || "€";

  const filteredCards = cards.filter((c) =>
    c.cardName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalFilteredValue = filteredCards.reduce((acc, c) => acc + c.totalValue, 0);
  const totalFilteredCopies = filteredCards.reduce((acc, c) => acc + c.quantity, 0);

  const handleCopyList = () => {
    const lines = filteredCards.map((c) => `${c.quantity} ${c.cardName}`);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner explicativo y de valor liquidable */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 shrink-0">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Detector de Cartas Dormidas
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {data?.uniqueCards ?? 0} únicas
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Cartas físicas en tu colección que <strong>no están asignadas a ningún mazo</strong> y{" "}
                <strong>tampoco las pide EDHREC</strong> para ninguno de tus comandantes activos. Son candidatas ideales para vender o tradear para financiar las que te faltan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyList}
              disabled={filteredCards.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "¡Copiado!" : "Copiar Lista"}</span>
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={loadDormant}
              disabled={isLoading}
              className="h-9 w-9"
              title="Recargar detector"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Resumen financiero del capital inmovilizado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-500/20">
          <div className="p-3 rounded-lg bg-background/60 border border-border">
            <span className="text-xs text-muted-foreground">Capital Inmovilizado</span>
            <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {formatPrice(data?.totalValue ?? 0, symbol)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/60 border border-border">
            <span className="text-xs text-muted-foreground">Copias Físicas Disponibles</span>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {data?.totalCards ?? 0} copias
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/60 border border-border">
            <span className="text-xs text-muted-foreground">Comandantes Contrastados</span>
            <p className="text-sm font-medium text-foreground truncate mt-1" title={data?.activeCommanders.join(", ")}>
              {data?.activeCommanders && data.activeCommanders.length > 0
                ? `${data.activeCommanders.length} comandantes activos`
                : "Sin comandantes asignados"}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar entre cartas dormidas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground shrink-0 mr-1">Precio mín:</span>
          {[0, 0.5, 1, 2, 5].map((p) => (
            <button
              key={p}
              onClick={() => setMinPrice(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 ${
                minPrice === p
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === 0 ? "Todos" : `≥ ${p}${symbol}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cartas Dormidas */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Analizando inventario y contrastando con EDHREC...</span>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-xl border border-dashed border-border bg-card max-w-xl mx-auto space-y-3">
          <div className="h-12 w-12 mx-auto rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">¡Colección 100% Optimizada!</h3>
          <p className="text-xs text-muted-foreground">
            {minPrice > 0
              ? `No tienes cartas dormidas con precio superior a ${minPrice}${symbol}.`
              : "Todas las cartas de tu colección están en uso o son sugerencias activas de EDHREC para tus mazos."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground font-mono">
            Mostrando {filteredCards.length} cartas ({totalFilteredCopies} copias) con un valor acumulado de{" "}
            <span className="font-bold text-foreground">{formatPrice(totalFilteredValue, symbol)}</span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-lg bg-card border-border hover:border-amber-500/40"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground truncate max-w-[130px]">
                      {card.typeLine ? card.typeLine.split("—")[0].trim() : "Carta"}
                    </span>
                    <div className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-md bg-amber-950/50 text-amber-300 border border-amber-800/40 font-bold">
                      <span>{formatPrice(card.totalValue, symbol)}</span>
                    </div>
                  </div>

                  {/* Imagen MTG */}
                  <div
                    onClick={() => setSelectedCardForDetail(card)}
                    className="relative cursor-pointer group/img w-full flex justify-center pt-0.5"
                    title="Ver detalles"
                  >
                    <div
                      className="relative w-full max-w-[260px] rounded-xl overflow-hidden border-2 border-border/80 group-hover/img:border-primary shadow-md group-hover/img:shadow-xl group-hover/img:scale-[1.02] transition-all duration-200 bg-secondary/30"
                      style={{ aspectRatio: "63 / 88" }}
                    >
                      {card.imageUri ? (
                        <Image
                          src={card.imageUri}
                          alt={card.cardName}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
                          <Moon className="w-8 h-8 text-muted-foreground/40" />
                          <span className="text-xs font-semibold">{card.cardName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Título & Info */}
                  <div className="space-y-1">
                    <h4
                      onClick={() => setSelectedCardForDetail(card)}
                      className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-1"
                    >
                      {card.cardName}
                      {card.isFoil && <span className="ml-1 text-xs text-primary font-normal">Foil</span>}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate max-w-[140px]">{card.typeLine || "Card"}</span>
                      <ManaCost manaCost={card.manaCost} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">
                    {card.quantity} {card.quantity === 1 ? "copia" : "copias"} × {formatPrice(card.price, symbol)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-semibold">
                    Disponible
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
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
          ownedInCollection={selectedCardForDetail.quantity}
        />
      )}
    </div>
  );
}
