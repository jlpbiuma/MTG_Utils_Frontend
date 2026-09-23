"use client";

import Link from "next/link";

import React, { useState, useEffect } from "react";
import {
  Search,
  Flame,
  CheckCircle2,
  Plus,
  ArrowUpDown,
  Sparkles,
  Crown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { CardImage as Image } from "@/components/card-image";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { getEdhrecCommanderRecommendations } from "@/actions/decks";
import {
  CommanderRecommendationsListResponse,
} from "@/lib/schemas";

const MANA_COLORS = ["W", "U", "B", "R", "G"] as const;

export function EdhrecRecommendationsView() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [top100Only, setTop100Only] = useState(false);
  const [ownedCommanderOnly, setOwnedCommanderOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"completion" | "rank" | "name">("completion");
  const [page, setPage] = useState(1);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [data, setData] = useState<CommanderRecommendationsListResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Load recommendations via effect
  useEffect(() => {
    let cancelled = false;

    getEdhrecCommanderRecommendations({
      search: submittedSearch.trim() || undefined,
      colors: selectedColors.length > 0 ? selectedColors.join(",") : undefined,
      top100Only,
      ownedCommanderOnly,
      sortBy,
      page,
      pageSize: 24,
    })
      .then((res) => {
        if (!cancelled) {
          setData(res);
        }
      })
      .catch((err) => {
        console.error("Error loading EDHREC commander recommendations:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, sortBy, top100Only, ownedCommanderOnly, selectedColors, submittedSearch, reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  // Handle search with debounce / submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setSubmittedSearch(search);
  };

  const toggleColor = (c: string) => {
    setLoading(true);
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((col) => col !== c) : [...prev, c]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setLoading(true);
    setSearch("");
    setSubmittedSearch("");
    setSelectedColors([]);
    setTop100Only(false);
    setOwnedCommanderOnly(false);
    setSortBy("completion");
    setPage(1);
  };

  const commanders = data?.commanders || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Intro info box */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Comandantes Recomendados por Completitud de tu Colección
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
              Calculamos qué porcentaje de cada mazo arquetípico de EDHREC puedes construir inmediatamente con las cartas de tu inventario, respetando la proporción media de criaturas, instantáneos, conjuros, artefactos y tierras.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs shrink-0 gap-1.5 border-border hover:bg-secondary"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comandante por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-input text-sm border-border"
          />
        </form>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Quick toggle filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={top100Only ? "secondary" : "ghost"}
              onClick={() => {
                setLoading(true);
                setTop100Only(!top100Only);
                setPage(1);
              }}
              className={`h-8 px-3 text-xs gap-1.5 ${
                top100Only
                  ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Solo Top 100 EDHREC</span>
            </Button>

            <Button
              size="sm"
              variant={ownedCommanderOnly ? "secondary" : "ghost"}
              onClick={() => {
                setLoading(true);
                setOwnedCommanderOnly(!ownedCommanderOnly);
                setPage(1);
              }}
              className={`h-8 px-3 text-xs gap-1.5 ${
                ownedCommanderOnly
                  ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>En mi colección</span>
            </Button>

            {/* Color Identity Selector */}
            <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground px-2 font-medium">Colores:</span>
              {MANA_COLORS.map((c) => {
                const isSelected = selectedColors.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleColor(c)}
                    className={`h-6 w-6 rounded text-xs font-bold font-mono transition-all flex items-center justify-center ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {(search || selectedColors.length > 0 || top100Only || ownedCommanderOnly) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-400"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-muted-foreground font-medium">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
              Ordenar por:
            </span>
            {(
              [
                ["completion", "Completitud"],
                ["rank", "Popularidad"],
                ["name", "Nombre"],
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                size="sm"
                variant={sortBy === mode ? "secondary" : "ghost"}
                onClick={() => {
                  setLoading(true);
                  setSortBy(mode);
                  setPage(1);
                }}
                className={`h-7 px-2.5 text-xs ${
                  sortBy === mode
                    ? "bg-primary/20 text-primary font-semibold border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando <strong className="text-foreground">{commanders.length}</strong> de{" "}
          <strong className="text-foreground">{total}</strong> comandantes recomendados.
        </span>
        {totalPages > 1 && (
          <span>
            Página <strong className="text-foreground">{page}</strong> de{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-20 px-4 rounded-xl border border-dashed border-border bg-card">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium text-foreground">Analizando recomendaciones de EDHREC y tu colección...</p>
        </div>
      ) : commanders.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border bg-card max-w-xl mx-auto">
          <div className="h-14 w-14 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
            <Crown className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No se encontraron comandantes</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
            {search || selectedColors.length > 0 || top100Only || ownedCommanderOnly
              ? "Prueba cambiando o relajando los filtros para ver más sugerencias de EDHREC."
              : "El worker está descargando el catálogo de EDHREC en segundo plano (1 mazo cada 30s). Revisa de nuevo en unos minutos o pulsa 'Actualizar'."}
          </p>
          {(search || selectedColors.length > 0 || top100Only || ownedCommanderOnly) && (
            <Button size="sm" variant="outline" onClick={clearFilters} className="mt-4 text-xs">
              Limpiar filtros
            </Button>
          )}
        </div>
      ) : (
        /* Commander Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {commanders.map((cmd) => {
            const hasOwnership = cmd.userOwnsCommander;
            const completionColor =
              cmd.completionPercentage >= 70
                ? "text-emerald-400"
                : cmd.completionPercentage >= 40
                ? "text-amber-400"
                : "text-sky-400";

            return (
              <Card
                key={cmd.id}
                className="flex flex-col group hover:border-amber-500/40 transition-all duration-300 relative overflow-hidden bg-card/70 backdrop-blur-sm shadow-md"
              >
                {/* Visual Top Bar based on completion */}
                <div
                  className={`h-1 w-full transition-all duration-300 ${
                    cmd.completionPercentage >= 70
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : cmd.completionPercentage >= 40
                      ? "bg-gradient-to-r from-amber-500 to-orange-400"
                      : "bg-primary/50"
                  }`}
                />

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {cmd.isTop100 && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                        >
                          <Flame className="h-3 w-3 text-amber-400 shrink-0" />
                          <span>Top 100 EDHREC{cmd.edhrecRank ? ` #${cmd.edhrecRank}` : ""}</span>
                        </Badge>
                      )}
                      {hasOwnership && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[11px] font-medium flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>En tu colección</span>
                        </Badge>
                      )}
                    </div>
                    {cmd.numDecks > 0 && (
                      <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                        {cmd.numDecks.toLocaleString()} mazos
                      </span>
                    )}
                  </div>

                  {/* Commander Name and Colors */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-amber-300 transition-colors line-clamp-1">
                        {cmd.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Formato Commander / EDH</p>
                    </div>
                    <ColorIdentityPips colors={cmd.colorIdentity} size="md" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  {/* Image & Main Completion Gauge */}
                  <div className="flex gap-4 items-center">
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-border shadow-md shrink-0 bg-secondary/50">
                      {cmd.imageUri ? (
                        <Image
                          src={cmd.imageUri}
                          alt={cmd.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Crown className="h-6 w-6 opacity-30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-400">Completitud</span>
                        <span className={`text-2xl font-black font-mono tracking-tight ${completionColor}`}>
                          {cmd.completionPercentage}%
                        </span>
                      </div>
                      <Progress value={cmd.completionPercentage} className="h-2.5 bg-secondary" />
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {cmd.ownedCardsCount} / {cmd.totalRequiredCards} cartas en posesión
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground">Valor en colección</p><strong className="text-emerald-400">{cmd.ownedValue == null ? "Sin datos" : `${cmd.ownedValue.toFixed(2)} €`}</strong></div>
                    <div><p className="text-muted-foreground">Valor faltante</p><strong className="text-rose-400">{cmd.missingValue == null ? "Sin datos" : `${cmd.missingValue.toFixed(2)} €`}</strong></div>
                    {([
                      ["Mejores sinergias", cmd.highSynergyCoverage],
                      ["Top Cards", cmd.topCardsCoverage],
                    ] as const).map(([label, coverage]) => (
                      <div key={label}>
                        <p className="text-muted-foreground">{label}</p>
                        <strong>{coverage?.percentage == null ? "Sin datos" : `${coverage.percentage}%`}</strong>
                        {coverage && coverage.total > 0 && <span className="text-muted-foreground"> · {coverage.owned}/{coverage.total} en colección</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Importes estimados para los cupos de EDHREC, priorizando tu colección.</p>
                  {!!(cmd.unpricedCards || cmd.unfilledSlots) && <p className="text-xs text-amber-400">Estimación parcial: {cmd.unpricedCards || 0} cartas sin precio y {cmd.unfilledSlots || 0} huecos sin cubrir.</p>}

                  {/* Card Type Breakdown Pills */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Desglose por tipo en EDHREC
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">🦁 Criaturas:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.creaturesOwned}/{cmd.typeBreakdown.creatures}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">⚡ Instantáneos:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.instantsOwned}/{cmd.typeBreakdown.instants}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">📜 Conjuros:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.sorceriesOwned}/{cmd.typeBreakdown.sorceries}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">🏺 Artefactos:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.artifactsOwned}/{cmd.typeBreakdown.artifacts}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">✨ Encantamientos:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.enchantmentsOwned}/{cmd.typeBreakdown.enchantments}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded bg-secondary/40 border border-border/50">
                        <span className="text-muted-foreground">🏔️ Tierras no básicas:</span>
                        <span className="font-semibold text-foreground">
                          {cmd.typeOwnership.nonbasicLandsOwned}/{cmd.typeBreakdown.nonbasicLands}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-border/60 flex-col gap-2">
                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <Link href={`/decks/recommendations/${encodeURIComponent(cmd.slug)}`}>Ver mazo y cartas</Link>
                  </Button>
                  <CreateDeckDialog
                    initialCommander={cmd.name}
                    initialName={`Mazo ${cmd.name}`}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-300 font-medium transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Crear mazo con este comandante
                      </Button>
                    }
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="text-xs gap-1 border-border"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <span className="text-xs text-muted-foreground font-mono px-3">
            Página {page} de {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="text-xs gap-1 border-border"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
