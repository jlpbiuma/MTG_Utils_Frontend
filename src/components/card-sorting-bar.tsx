"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortField, SortDirection } from "@/lib/sorting";

interface CardSortingBarProps {
  currentField: SortField;
  currentDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  showStatusOption?: boolean;
  showEdhrecOptions?: boolean;
  showRequestedDecksOption?: boolean;
  requestedDecksLabel?: string;
}

export function CardSortingBar({
  currentField,
  currentDirection,
  onSortChange,
  showStatusOption = false,
  showEdhrecOptions = false,
  showRequestedDecksOption = false,
  requestedDecksLabel = "Se pide en",
}: CardSortingBarProps) {
  const sortOptions: Array<{ field: SortField; label: string }> = [
    ...(showEdhrecOptions
      ? [
          { field: "inclusion" as SortField, label: "Inclusión" },
          { field: "synergy" as SortField, label: "Sinergia" },
        ]
      : []),
    { field: "name", label: "Nombre" },
    { field: "price_trend", label: "Precio (Unitario)" },
    { field: "price_subtotal", label: "Precio (Subtotal)" },
    { field: "cmc", label: "Coste / CMC" },
    { field: "type", label: "Tipo" },
    { field: "quantity", label: "Cantidad" },
    ...(showStatusOption
      ? [
          { field: "status" as SortField, label: "Estado / Asignación" },
          { field: "requested_decks" as SortField, label: "Más solicitada" },
        ]
      : []),
    ...(showRequestedDecksOption && !showStatusOption
      ? [{ field: "requested_decks" as SortField, label: requestedDecksLabel }]
      : []),
  ];

  const handleFieldClick = (field: SortField) => {
    if (currentField === field) {
      // Toggle direction
      onSortChange(field, currentDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to asc for name/cmc/type, desc for price/quantity/requested_decks
      const defaultDesc =
        field === "inclusion" ||
        field === "synergy" ||
        field.startsWith("price") ||
        field === "quantity" ||
        field === "requested_decks";
      onSortChange(field, defaultDesc ? "desc" : "asc");
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground py-2">
      <span className="flex items-center gap-1 text-muted-foreground font-medium mr-1">
        <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
        Ordenar por:
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        {sortOptions.map((opt) => {
          const isActive = currentField === opt.field;
          return (
            <button
              key={opt.field}
              onClick={() => handleFieldClick(opt.field)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium border text-xs ${
                isActive
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-border"
              }`}
            >
              <span>{opt.label}</span>
              {isActive && (
                <span className="text-primary font-bold">
                  {currentDirection === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
