"use client";

import React from "react";
import { COLOR_ORDER } from "@/lib/deck-colors";
import { cn } from "@/lib/utils";
import { ManaSymbol, isStandardManaColor } from "@/components/mana-symbol";

const COLOR_NAMES_ES: Record<string, string> = {
  W: "Blanco",
  U: "Azul",
  B: "Negro",
  R: "Rojo",
  G: "Verde",
  C: "Incoloro",
};

interface ColorIdentityPipsProps {
  colors?: string[] | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

export function ColorIdentityPips({
  colors,
  size = "sm",
  className,
  title,
}: ColorIdentityPipsProps) {
  const present = colors?.filter((c) => COLOR_ORDER.includes(c as never)) || [];
  if (present.length === 0) return null;

  const sizeClasses = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1 shrink-0", className)}
      title={title}
    >
      {present.map((color) => {
        const colorName = COLOR_NAMES_ES[color] || color;
        if (isStandardManaColor(color)) {
          return (
            <span
              key={color}
              className={cn(
                "inline-flex items-center justify-center shrink-0 rounded-full ring-1 ring-black/30 shadow-xs",
                sizeClasses[size]
              )}
              title={colorName}
              data-testid={`color-pip-${color}`}
            >
              <ManaSymbol symbol={color} className="h-full w-full" />
              <span className="sr-only">{color}</span>
            </span>
          );
        }

        return (
          <span
            key={color}
            className={cn(
              "inline-block rounded-full ring-1 ring-inset bg-slate-600",
              sizeClasses[size]
            )}
            title={colorName}
          />
        );
      })}
    </span>
  );
}