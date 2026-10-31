import React from "react";
import { cn } from "@/lib/utils";
import {
  CompositeManaSymbol,
  ManaSymbol,
  isStandardManaColor,
  parseCompositeManaSymbol,
} from "@/components/mana-symbol";

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

const SIZE_CIRCLE = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
};

/** Symbols of each face of a cost such as "{2}{W/P}" or "{1}{R} // {1}{U}". */
export function parseManaCostFaces(manaCost?: string | null): string[][] {
  if (!manaCost) return [];
  return manaCost
    .split("//")
    .map((face) => (face.match(/\{([^}]+)\}/g) || []).map((sym) => sym.slice(1, -1)))
    .filter((face) => face.length > 0);
}

export function ManaCost({ manaCost, className, size = "md" }: ManaCostProps) {
  const faces = parseManaCostFaces(manaCost);
  if (faces.length === 0) return null;

  const renderSymbol = (text: string, key: string) => {
    const clean = text.toUpperCase();
    const isColor = isStandardManaColor(clean);
    if (isColor || parseCompositeManaSymbol(clean)) {
      return (
        <span
          key={key}
          className={cn(
            "inline-flex items-center justify-center rounded-full shrink-0 shadow-xs select-none ring-1 ring-black/20",
            SIZE_CIRCLE[size]
          )}
          title={`Mana: ${text}`}
          data-testid={`mana-symbol-${clean}`}
        >
          {isColor ? (
            <ManaSymbol symbol={clean} className="h-full w-full" />
          ) : (
            <CompositeManaSymbol symbol={clean} className="h-full w-full" />
          )}
          <span className="sr-only">{text}</span>
        </span>
      );
    }

    return (
      <span
        key={key}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-1 font-black bg-[#CAC5C0] text-[#0D0F0F] ring-1 ring-black/20 shadow-xs leading-none select-none shrink-0",
          SIZE_CONTAINER[size]
        )}
        title={`Mana: ${text}`}
      >
        {text}
      </span>
    );
  };

  return (
    <span className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
      {faces.map((symbols, faceIndex) => (
        <React.Fragment key={faceIndex}>
          {faceIndex > 0 && (
            <span
              className="px-0.5 text-muted-foreground font-semibold select-none"
              aria-label="otra cara"
              data-testid="mana-face-separator"
            >
              {"//"}
            </span>
          )}
          {symbols.map((sym, idx) => renderSymbol(sym, `${faceIndex}-${idx}`))}
        </React.Fragment>
      ))}
    </span>
  );
}
