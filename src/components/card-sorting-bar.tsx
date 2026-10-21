"use client";

import { ToolbarSort } from "@/components/view-toolbar";

import React from "react";
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

  return <ToolbarSort
    value={currentField}
    direction={currentDirection}
    onChange={onSortChange}
    options={sortOptions.map((option) => ({
      value: option.field,
      label: option.label,
      defaultDesc:
        option.field === "inclusion" ||
        option.field === "synergy" ||
        option.field.startsWith("price") ||
        option.field === "quantity" ||
        option.field === "requested_decks",
    }))}
  />;
}
