import React from "react";
import { cn } from "@/lib/utils";
import { ManaSymbol, isStandardManaColor } from "@/components/mana-symbol";

interface ManaCostProps {
  manaCost?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md";
}

const SIZE_CONTAINER = {
  xs: "h-3.5 min-w-[14px] text-[9px]",
  sm: "h-4 min-w-[16px] text-[10px]",
  md: "h-5 min-w-[20px] text-[11px]",
};

export function ManaCost({ manaCost, className, size = "md" }: ManaCostProps) {
  if (!manaCost) return null;

  // Extract all symbols like {3}, {W}, {U}, {B}, {R}, {G}, {W/P}, etc.
  const symbols = manaCost.match(/\{([^}]+)\}/g) || [];

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {symbols.map((sym, idx) => {
        const text = sym.replace(/[{}]/g, "");
        const clean = text.toUpperCase();

        if (isStandardManaColor(clean)) {
          return (
            <span
              key={idx}
              className={cn(
                "inline-flex items-center justify-center rounded-full shrink-0 shadow-xs select-none ring-1 ring-black/20",
                size === "xs" ? "h-3.5 w-3.5" : size === "sm" ? "h-4 w-4" : "h-5 w-5"
              )}
              title={`Mana: ${text}`}
              data-testid={`mana-symbol-${clean}`}
            >
              <ManaSymbol symbol={clean} className="h-full w-full" />
              <span className="sr-only">{text}</span>
            </span>
          );
        }

        return (
          <span
            key={idx}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-1 font-black bg-[#CAC5C0] text-[#0D0F0F] ring-1 ring-black/20 shadow-xs leading-none select-none shrink-0",
              SIZE_CONTAINER[size]
            )}
            title={`Mana: ${text}`}
          >
            {text}
          </span>
        );
      })}
    </span>
  );
}

