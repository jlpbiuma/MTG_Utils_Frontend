"use client";

import React from "react";
import { Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface PriceFilterProps {
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  currencySymbol?: string;
  onClear?: () => void;
  className?: string;
  size?: "sm" | "default";
}

export function PriceFilter({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  currencySymbol = "€",
  onClear,
  className = "",
  size = "default",
}: PriceFilterProps) {
  const hasFilter = minPrice.trim() !== "" || maxPrice.trim() !== "";

  const handleClear = () => {
    onMinPriceChange("");
    onMaxPriceChange("");
    onClear?.();
  };

  const isSmall = size === "sm";

  return (
    <div
      className={`inline-flex items-center gap-1.5 p-1 rounded-lg border transition-colors ${
        hasFilter
          ? "bg-primary/5 border-primary/40 text-primary shadow-xs"
          : "bg-background border-border text-muted-foreground"
      } ${className}`}
      title="Filtrar por rango de precio (mínimo y máximo)"
    >
      <div className="flex items-center gap-1 pl-1 text-xs font-semibold shrink-0">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Precio:</span>
      </div>

      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={`Mín (${currencySymbol})`}
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className={`${
            isSmall ? "h-7 w-20 text-[11px]" : "h-8 w-22 sm:w-24 text-xs"
          } px-2 py-0 border-border bg-background focus-visible:ring-1 focus-visible:ring-ring`}
          aria-label="Precio mínimo"
        />

        <span className="text-xs text-muted-foreground font-mono">-</span>

        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={`Máx (${currencySymbol})`}
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className={`${
            isSmall ? "h-7 w-20 text-[11px]" : "h-8 w-22 sm:w-24 text-xs"
          } px-2 py-0 border-border bg-background focus-visible:ring-1 focus-visible:ring-ring`}
          aria-label="Precio máximo"
        />

        {hasFilter && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className={`${
              isSmall ? "h-7 w-7" : "h-8 w-8"
            } p-0 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md shrink-0`}
            title="Limpiar filtro de precio"
            aria-label="Limpiar filtro de precio"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
