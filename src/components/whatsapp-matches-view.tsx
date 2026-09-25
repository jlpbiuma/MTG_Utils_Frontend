"use client";

import React, { useState, useMemo } from "react";
import {
  MessageCircle,
  Search,
  ShoppingCart,
  Tag,
  Clock,
  Layers,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardImage as Image } from "@/components/card-image";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { ManaCost } from "@/components/mana-cost";
import type {
  WhatsAppMatchesResponse,
  WhatsAppDealMatch,
} from "@/actions/whatsapp-matches";

interface WhatsAppMatchesViewProps {
  initialData: WhatsAppMatchesResponse;
}

export function WhatsAppMatchesView({ initialData }: WhatsAppMatchesViewProps) {
  const [activeTab, setActiveTab] = useState<"wants" | "collection">("wants");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialData.wants_matches;
    return initialData.wants_matches.filter((m) => {
      const matchName = m.card_name.toLowerCase().includes(q);
      const matchPhone = m.source_phone.includes(q);
      const matchSet = m.set_code?.toLowerCase().includes(q);
      const matchDecks = m.matched_want?.requested_decks.some((d) =>
        d.toLowerCase().includes(q)
      );
      return matchName || matchPhone || matchSet || matchDecks;
    });
  }, [initialData.wants_matches, searchQuery]);

  const filteredCollection = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return initialData.collection_matches;
    return initialData.collection_matches.filter((m) => {
      const matchName = m.card_name.toLowerCase().includes(q);
      const matchPhone = m.source_phone.includes(q);
      const matchSet = m.set_code?.toLowerCase().includes(q);
      return matchName || matchPhone || matchSet;
    });
  }, [initialData.collection_matches, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Encabezado y Estadísticas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              Oportunidades de Mercado
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs px-2.5 py-0.5"
            >
              Radar WhatsApp Activo
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cruce automático entre las cartas detectadas en el chat y tus Wants /
            Colección física.
          </p>
        </div>

        {/* Resumen de actividad */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-lg p-2.5 px-3.5">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>
              Escaneadas:{" "}
              <strong className="text-foreground font-semibold">
                {initialData.total_cards_scanned}
              </strong>
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {initialData.last_scraped_at ? (
                <>
                  Actualizado:{" "}
                  {new Date(initialData.last_scraped_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              ) : (
                "Esperando actividad"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs y Buscador */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "wants" | "collection")}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="bg-muted/40 p-1 border border-border/60">
            <TabsTrigger
              value="wants"
              className="gap-2 data-[state=active]:bg-emerald-950/60 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 border border-transparent"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Comprar (Wants en venta)</span>
              <Badge
                variant="secondary"
                className={`ml-1 px-1.5 py-0.2 text-[11px] ${
                  initialData.total_wants_matches > 0
                    ? "bg-emerald-500/20 text-emerald-300 font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {initialData.total_wants_matches}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="collection"
              className="gap-2 data-[state=active]:bg-sky-950/60 data-[state=active]:text-sky-300 data-[state=active]:border-sky-500/30 border border-transparent"
            >
              <Tag className="h-4 w-4" />
              <span>Vender (Tu colección en demanda)</span>
              <Badge
                variant="secondary"
                className={`ml-1 px-1.5 py-0.2 text-[11px] ${
                  initialData.total_collection_matches > 0
                    ? "bg-sky-500/20 text-sky-300 font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {initialData.total_collection_matches}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por carta, teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/60 text-sm"
            />
          </div>
        </div>

        {/* Pestaña 1: Wants en Venta */}
        <TabsContent value="wants" className="space-y-4">
          {filteredWants.length === 0 ? (
            <EmptyState
              type="wants"
              hasSearch={Boolean(searchQuery)}
              onClearSearch={() => setSearchQuery("")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWants.map((match) => (
                <MatchCard key={`want-${match.id}`} match={match} mode="want" />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pestaña 2: Colección en Demanda */}
        <TabsContent value="collection" className="space-y-4">
          {filteredCollection.length === 0 ? (
            <EmptyState
              type="collection"
              hasSearch={Boolean(searchQuery)}
              onClearSearch={() => setSearchQuery("")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCollection.map((match) => (
                <MatchCard
                  key={`col-${match.id}`}
                  match={match}
                  mode="collection"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchCard({
  match,
  mode,
}: {
  match: WhatsAppDealMatch;
  mode: "want" | "collection";
}) {
  const isWant = mode === "want";
  const imageUri = match.catalog_card?.image_uri;
  const cardName = match.card_name;
  const manaCost = match.catalog_card?.mana_cost;
  const typeLine = match.catalog_card?.type_line;

  // Formato origen de enlace
  const originLabel = useMemo(() => {
    const url = match.whatsapp_url.toLowerCase();
    if (url.startsWith("ocr-image://")) return "Foto OCR";
    if (url.includes("manabox.app")) return "ManaBox";
    if (url.includes("moxfield.com")) return "Moxfield";
    if (url.includes("archidekt.com")) return "Archidekt";
    if (url.includes("cardmarket.com")) return "Cardmarket";
    return "Enlace Web";
  }, [match.whatsapp_url]);

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 hover:bg-card/90 hover:border-border transition-all duration-200 overflow-hidden shadow-sm">
      <div className="p-4 space-y-3">
        {/* Cabecera de la carta */}
        <div className="flex items-start gap-3">
          {/* Miniatura con Hover Preview */}
          <CardPreviewHover cardName={cardName} imageUri={imageUri} size="lg">
            <div className="relative w-12 h-16 rounded-md overflow-hidden bg-muted/40 border border-border/60 shrink-0 cursor-pointer">
              {imageUri ? (
                <Image
                  src={imageUri}
                  alt={cardName}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                  MTG
                </div>
              )}
            </div>
          </CardPreviewHover>

          {/* Información principal */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-1">
              <h3 className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                {cardName}
              </h3>
              {match.price && (
                <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  {match.price} {match.currency || "€"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {manaCost && <ManaCost manaCost={manaCost} size="xs" />}
              {match.set_code && (
                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                  [{match.set_code}]
                </span>
              )}
            </div>

            {typeLine && (
              <p className="text-[11px] text-muted-foreground truncate">
                {typeLine}
              </p>
            )}
          </div>
        </div>

        {/* Bloque contextual según modo */}
        <div
          className={`rounded-lg p-2.5 text-xs space-y-1.5 border ${
            isWant
              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-200/90"
              : "bg-sky-950/20 border-sky-500/20 text-sky-200/90"
          }`}
        >
          {isWant ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium text-emerald-400">
                  En tus Wants:
                </span>
                <span className="font-bold">
                  {match.matched_want?.quantity_wanted || 1} copia(s)
                </span>
              </div>
              {match.matched_want?.requested_decks &&
                match.matched_want.requested_decks.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                    <FolderOpen className="h-3 w-3 shrink-0 text-emerald-400/70" />
                    <span className="truncate">
                      Para: {match.matched_want.requested_decks.join(", ")}
                    </span>
                  </div>
                )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sky-400">En tu Colección:</span>
                <span className="font-bold">
                  {match.matched_collection?.quantity_owned || 1} copia(s)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Disponibles / Libres:</span>
                <span className="text-sky-300 font-semibold">
                  {match.matched_collection?.available_quantity || 0} copia(s)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Origen y mensaje original si existe */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {originLabel}
            </Badge>
          </span>
          {match.detected_at && (
            <span>
              {new Date(match.detected_at).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {match.raw_message && !match.whatsapp_url.startsWith("ocr-image://") && (
          <p className="text-[11px] text-muted-foreground/80 italic line-clamp-2 bg-muted/20 p-1.5 rounded border border-border/30">
            &ldquo;{match.raw_message}&rdquo;
          </p>
        )}
      </div>

      {/* Pie con botón de contacto WhatsApp */}
      <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground truncate">
          +{match.source_phone}
        </span>

        <Button
          asChild
          size="sm"
          className="h-8 text-xs gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold shadow-sm transition-all"
        >
          <a
            href={match.direct_whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-3.5 w-3.5 fill-black" />
            Contactar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  type,
  hasSearch,
  onClearSearch,
}: {
  type: "wants" | "collection";
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-card/30">
        <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <h3 className="text-sm font-semibold text-foreground">
          No se encontraron resultados
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          No hay coincidencias para el término buscado.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSearch}
          className="mt-3 text-xs"
        >
          Limpiar filtro
        </Button>
      </div>
    );
  }

  const isWants = type === "wants";

  return (
    <div className="text-center py-16 border border-dashed border-border/60 rounded-xl bg-card/20 space-y-3">
      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
        {isWants ? (
          <ShoppingCart className="h-6 w-6 text-emerald-400/80" />
        ) : (
          <Tag className="h-6 w-6 text-sky-400/80" />
        )}
      </div>

      <div className="max-w-md mx-auto space-y-1">
        <h3 className="text-base font-semibold text-foreground">
          {isWants
            ? "Sin ofertas de venta para tus Wants aún"
            : "Sin peticiones para tu colección actualmente"}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isWants
            ? "Cuando alguien comparta una lista o foto en WhatsApp con intención de venta de cartas que tienes en tus Wants, se mostrará aquí automáticamente."
            : "Cuando alguien en el grupo escriba «busco» o «compro» cartas que tienes en tu colección física, aparecerán aquí para que puedas contactarle."}
        </p>
      </div>
    </div>
  );
}
