"use client";

import { ViewToolbar, ToolbarSearch, ToolbarChoices, ToolbarSort } from "@/components/view-toolbar";

import { useQueryState, useQueryFlag } from "@/hooks/use-query-state";

import React, { useMemo } from "react";
import { Layers, Archive, FolderTree, LayoutGrid, Wallet, Gauge, Tag, ShoppingCart } from "lucide-react";

import { DeckCardItem } from "@/components/deck-card-item";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { ImportDeckDialog } from "@/components/import-deck-dialog";
import { DeckWithCompletion } from "@/lib/schemas";
import { COLOR_GROUPS, ColorGroupInfo, NO_COLOR_GROUP, buildColorIdentity } from "@/lib/deck-colors";
import { ColorIdentityPips } from "@/components/color-identity-pips";

type DeckSortMode = "price" | "price_missing" | "completion" | "name";
type SortDirection = "asc" | "desc";
type CompletionFilter = "all" | "complete" | "incomplete";

interface DeckListViewProps {
  decks: DeckWithCompletion[];
  isArchivedView?: boolean;
}

interface GroupTemplate {
  info: ColorGroupInfo;
  decks: DeckWithCompletion[];
}

function deckIdentity(deck: DeckWithCompletion): string {
  return deck.colorIdentity || buildColorIdentity(deck.colors) || "";
}

export function DeckListView({ decks, isArchivedView = false }: DeckListViewProps) {
  const [searchQuery, setSearchQuery] = useQueryState<string>("q", "");
  const [sortMode, setSortMode] = useQueryState<DeckSortMode>("sort", "completion", ["completion", "name", "price", "price_missing"]);
  const [sortDirection, setSortDirection] = useQueryState<SortDirection>("direction", "desc", ["asc", "desc"]);
  const [groupedByColor, setGroupedByColor] = useQueryFlag("group", false);
  const [completionFilter, setCompletionFilter] = useQueryState<CompletionFilter>("filter", "all", ["all", "complete", "incomplete"]);

  const query = searchQuery.trim().toLowerCase();

  const filteredDecks = useMemo(() => {
    return decks.filter((d) => {
      if (completionFilter === "complete" && d.completionPercentage < 100) return false;
      if (completionFilter === "incomplete" && d.completionPercentage >= 100) return false;
      if (!query) return true;
      const haystack = `${d.name} ${d.commander || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [decks, query, completionFilter]);

  const compare = useMemo(() => {
    const dir = sortDirection;
    const byName = (a: DeckWithCompletion, b: DeckWithCompletion) =>
      a.name.localeCompare(b.name);

    switch (sortMode) {
      case "price": {
        return (a: DeckWithCompletion, b: DeckWithCompletion) => {
          const aHas = a.totalValue != null;
          const bHas = b.totalValue != null;
          if (aHas !== bHas) return aHas ? -1 : 1;
          if (aHas && bHas) {
            const diff = (a.totalValue as number) - (b.totalValue as number);
            if (diff !== 0) return dir === "desc" ? -diff : diff;
          }
          return byName(a, b);
        };
      }
      case "price_missing": {
        return (a: DeckWithCompletion, b: DeckWithCompletion) => {
          const aHas = a.missingValue != null;
          const bHas = b.missingValue != null;
          if (aHas !== bHas) return aHas ? -1 : 1;
          if (aHas && bHas) {
            const diff = (a.missingValue as number) - (b.missingValue as number);
            if (diff !== 0) return dir === "desc" ? -diff : diff;
          }
          return byName(a, b);
        };
      }
      case "completion": {
        return (a: DeckWithCompletion, b: DeckWithCompletion) => {
          const diff = a.completionPercentage - b.completionPercentage;
          if (diff !== 0) return dir === "desc" ? -diff : diff;
          return byName(a, b);
        };
      }
      default: {
        const factor = dir === "desc" ? -1 : 1;
        return (a: DeckWithCompletion, b: DeckWithCompletion) =>
          factor * byName(a, b);
      }
    }
  }, [sortMode, sortDirection]);

  const sortedDecks = useMemo(
    () => [...filteredDecks].sort(compare),
    [filteredDecks, compare]
  );

  const groups = useMemo(() => {
    const buckets = new Map<string, DeckWithCompletion[]>();
    for (const deck of sortedDecks) {
      const key = deckIdentity(deck) || NO_COLOR_GROUP.identity;
      const list = buckets.get(key) || [];
      list.push(deck);
      buckets.set(key, list);
    }
    const result: GroupTemplate[] = [];
    for (const info of [...COLOR_GROUPS, NO_COLOR_GROUP]) {
      const decksInGroup = buckets.get(info.identity);
      if (decksInGroup && decksInGroup.length > 0) {
        result.push({ info, decks: decksInGroup });
      }
    }
    return result;
  }, [sortedDecks]);

  const groupedCount = groups.reduce((n, g) => n + g.decks.length, 0);
  const resultLabel =
    sortedDecks.length === 1
      ? "1 mazo"
      : `${sortedDecks.length} mazos`;

  const sortOptions: Array<{
    mode: DeckSortMode;
    label: string;
    defaultDesc: boolean;
    icon: React.ReactNode;
  }> = [
    { mode: "price", label: "Precio", defaultDesc: true, icon: <Wallet className="h-3.5 w-3.5" /> },
    { mode: "price_missing", label: "Precio Faltante", defaultDesc: true, icon: <ShoppingCart className="h-3.5 w-3.5" /> },
    { mode: "completion", label: "Completitud", defaultDesc: true, icon: <Gauge className="h-3.5 w-3.5" /> },
    { mode: "name", label: "Nombre", defaultDesc: false, icon: <Tag className="h-3.5 w-3.5" /> },
  ];

  const renderGrid = (items: DeckWithCompletion[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((deck) => (
        <DeckCardItem key={deck.id} deck={deck} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <ViewToolbar
        label="Opciones del listado de mazos"
        search={
          <ToolbarSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar mazo por nombre o por comandante..."
          />
        }
        filters={
          <ToolbarChoices
            label="Completitud"
            value={completionFilter}
            onChange={setCompletionFilter}
            options={[
              { value: "all", label: "Todos" },
              { value: "complete", label: "Completos" },
              { value: "incomplete", label: "Incompletos" },
            ]}
          />
        }
        sorting={
          <ToolbarSort
            value={sortMode}
            direction={sortDirection}
            onChange={(mode, direction) => {
              setSortMode(mode);
              setSortDirection(direction);
            }}
            options={sortOptions.map((option) => ({
              value: option.mode,
              label: option.label,
              icon: option.icon,
              defaultDesc: option.defaultDesc,
            }))}
          />
        }
        display={
          <ToolbarChoices
            label="Vista"
            value={groupedByColor ? "color" : "grid"}
            onChange={(value) => setGroupedByColor(value === "color")}
            options={[
              {
                value: "color",
                label: "Por Colores",
                icon: <FolderTree className="h-3.5 w-3.5" />,
              },
              { value: "grid", label: "Cuadrícula", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            ]}
          />
        }
      />

      <p className="text-xs text-muted-foreground">
        {query ? (
          <>
            Resultados para <strong className="text-foreground">“{searchQuery.trim()}”</strong>:{" "}
            {resultLabel}
          </>
        ) : (
          <>
            Mostrando <strong className="text-foreground">{resultLabel}</strong>
            {groupedByColor
              ? " agrupados por combinación de colores (EDHREC)."
              : "."}
          </>
        )}
      </p>

      {/* Decks content */}
      {sortedDecks.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-lg border border-dashed border-border bg-card max-w-2xl mx-auto my-6">
          <div className="h-16 w-16 mx-auto rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-4">
            {isArchivedView ? <Archive className="h-8 w-8 text-amber-500/70" /> : <Layers className="h-8 w-8" />}
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {query
              ? "Sin resultados para tu búsqueda"
              : completionFilter !== "all"
                ? "Ningún mazo coincide con el filtro"
                : isArchivedView
                  ? "No tienes ningún mazo archivado"
                  : "Aún no tienes ningún mazo"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            {query
              ? "Prueba buscando por otro nombre de mazo o de comandante."
              : completionFilter !== "all"
                ? "Cambia el filtro de completitud para ver el resto de mazos."
                : isArchivedView
                  ? "Los mazos archivados se guardan aquí. No cuentan para los cálculos de completitud ni para las métricas de valor faltante o total."
                  : "Crea tu primer mazo (Commander, Modern, Standard, etc.) y añade cartas oficiales desde Scryfall para calcular automáticamente tu porcentaje de posesión."}
          </p>
          {!query && completionFilter === "all" && !isArchivedView && (
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <ImportDeckDialog />
              <CreateDeckDialog />
            </div>
          )}
        </div>
      ) : groupedByColor ? (
        /* EDHREC-style color identity sections */
        <div className="space-y-10">
          {groups.map(({ info, decks: deckGroup }) => (
            <section
              key={info.identity || "no-color"}
              className="space-y-3"
              aria-label={info.label}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">{info.label}</h2>
                  <ColorIdentityPips colors={info.manaColors} size="md" />
                  <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                    {deckGroup.length} {deckGroup.length === 1 ? "mazo" : "mazos"}
                  </span>
                </div>
                <span className="hidden sm:block text-[11px] font-mono text-muted-foreground">
                  {info.numColors > 0
                    ? `${info.numColors} ${info.numColors === 1 ? "color" : "colores"}`
                    : "Sin identidad"}
                </span>
              </div>

              {renderGrid(deckGroup)}
            </section>
          ))}
          {groupedCount < sortedDecks.length && (
            <p className="text-xs text-muted-foreground">
              {sortedDecks.length - groupedCount} mazo(s) sin ninguna combinación de color identificada.
            </p>
          )}
        </div>
      ) : (
        /* Flat continuous grid */
        renderGrid(sortedDecks)
      )}
    </div>
  );
}
