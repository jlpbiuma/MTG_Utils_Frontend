"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SlidersHorizontal,
  FolderTree,
  AlignJustify,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from "lucide-react";
import { SortField, SortDirection } from "@/lib/sorting";

interface FloatingDeckControlsProps {
  // Sorting state
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  showStatusOption?: boolean;
  showEdhrecOptions?: boolean;

  // Grouping state
  isGroupedByType: boolean;
  onGroupingToggle: (grouped: boolean) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  hasSections?: boolean;

  // Deck info
  totalCards?: number;
}

export function FloatingDeckControls({
  sortField,
  sortDirection,
  onSortChange,
  showStatusOption = false,
  showEdhrecOptions = false,
  isGroupedByType,
  onGroupingToggle,
  onExpandAll,
  onCollapseAll,
  hasSections = false,
  totalCards,
}: FloatingDeckControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const sortOptions: Array<{ field: SortField; label: string }> = [
    ...(showEdhrecOptions
      ? [
          { field: "inclusion" as SortField, label: "Inclusión" },
          { field: "synergy" as SortField, label: "Sinergia" },
        ]
      : []),
    { field: "name", label: "Nombre" },
    { field: "price_trend", label: "Precio" },
    { field: "price_subtotal", label: "Subtotal" },
    { field: "cmc", label: "Coste / CMC" },
    { field: "type", label: "Tipo" },
    { field: "quantity", label: "Cantidad" },
    ...(showStatusOption
      ? [{ field: "status" as SortField, label: "Estado" }]
      : []),
  ];

  const handleFieldClick = (field: SortField) => {
    if (sortField === field) {
      onSortChange(field, sortDirection === "asc" ? "desc" : "asc");
    } else {
      const defaultDesc =
        field === "inclusion" ||
        field === "synergy" ||
        field.startsWith("price") ||
        field === "quantity";
      onSortChange(field, defaultDesc ? "desc" : "asc");
    }
  };

  const currentSortLabel =
    sortOptions.find((o) => o.field === sortField)?.label || "Nombre";

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Floating Popover Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="mb-3 w-80 sm:w-96 rounded-lg border border-border bg-card p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200 text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">
                Organizar y Agrupar
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Section 1: Grouping */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FolderTree className="h-3.5 w-3.5 text-primary" />
                Agrupación
              </span>
              {isGroupedByType && (
                <div className="flex items-center gap-1 text-[11px]">
                  {onExpandAll && (
                    <button
                      onClick={onExpandAll}
                      className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Expandir todo
                    </button>
                  )}
                  {onCollapseAll && (
                    <button
                      onClick={onCollapseAll}
                      className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Colapsar todo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-background border border-border">
              <button
                type="button"
                onClick={() => onGroupingToggle(true)}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  isGroupedByType
                    ? "bg-primary text-primary-foreground ring-1 ring-ring"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderTree className="h-4 w-4" />
                <span>Por Tipo</span>
              </button>

              <button
                type="button"
                onClick={() => onGroupingToggle(false)}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  !isGroupedByType
                    ? "bg-accent text-foreground ring-1 ring-ring"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlignJustify className="h-4 w-4" />
                <span>Lista Continua</span>
              </button>
            </div>
          </div>

          {/* Section 2: Sorting */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
              Ordenar Cartas por
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {sortOptions.map((opt) => {
                const isActive = sortField === opt.field;
                return (
                  <button
                    key={opt.field}
                    onClick={() => handleFieldClick(opt.field)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                      isActive
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-border"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && (
                      <span className="text-primary font-bold ml-1">
                        {sortDirection === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-card border border-primary/30 text-foreground hover:border-primary hover:scale-105 active:scale-95 transition-all group"
        title="Opciones flotantes para ordenar y agrupar cartas"
      >
        <div className="p-1 rounded-full bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-start text-left leading-none">
          <span className="text-xs font-semibold tracking-wide text-foreground">
            Vista & Orden
          </span>
          <span className="text-[10px] text-primary font-mono mt-1">
            {isGroupedByType ? "Agrupado" : "Lista"} • {currentSortLabel}{" "}
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        </div>
      </button>
    </div>
  );
}
