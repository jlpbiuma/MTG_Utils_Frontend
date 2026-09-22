"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCards: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalCards,
  startIndex,
  endIndex,
  onPageChange,
  itemLabel = "cartas",
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1 && totalCards <= 0) {
    return null;
  }

  const startDisplay = totalCards === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(endIndex, totalCards);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-muted-foreground",
        className
      )}
    >
      <div className="text-xs sm:text-sm">
        Mostrando <span className="font-semibold text-foreground">{startDisplay}</span> -{" "}
        <span className="font-semibold text-foreground">{endDisplay}</span> de{" "}
        <span className="font-semibold text-foreground">{totalCards}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 py-1 text-xs font-medium text-foreground bg-secondary rounded-md border border-border">
          {currentPage} / {Math.max(1, totalPages)}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
