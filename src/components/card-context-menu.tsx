"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  PlusCircle,
  Trash2,
  ArrowRightLeft,
  Tag,
  Eye,
  BookmarkPlus,
  Copy,
  Check,
} from "lucide-react";
import type { DeckCardWithOwnership } from "@/lib/schemas";

export interface CardContextMenuProps {
  card: DeckCardWithOwnership | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAddOne?: () => void;
  onAddMore?: () => void;
  onRemove?: () => void;
  onToggleSideboard?: () => void;
  onChangeTags?: () => void;
  onViewDetails?: () => void;
  onAddToWants?: () => void;
}

export function CardContextMenu({
  card,
  position,
  onClose,
  onAddOne,
  onAddMore,
  onRemove,
  onToggleSideboard,
  onChangeTags,
  onViewDetails,
  onAddToWants,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number } | null>(null);

  // Close on click outside or escape key
  useEffect(() => {
    if (!position) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [position, onClose]);

  // Adjust menu position so it stays in viewport
  useEffect(() => {
    if (!position) {
      setAdjustedPos(null);
      return;
    }

    const menuWidth = 240;
    const menuHeight = 320;
    const padding = 12;

    let left = position.x;
    let top = position.y;

    if (left + menuWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - menuWidth - padding);
    }

    if (top + menuHeight > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - menuHeight - padding);
    }

    setAdjustedPos({ top, left });
  }, [position]);

  if (!card || !adjustedPos) return null;

  const handleCopyName = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(card.cardName);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 800);
  };

  return (
    <div
      ref={menuRef}
      style={{
        top: `${adjustedPos.top}px`,
        left: `${adjustedPos.left}px`,
      }}
      className="fixed z-50 w-56 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl p-1.5 text-xs text-popover-foreground animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with card name */}
      <div className="px-2.5 py-1.5 font-semibold text-foreground truncate border-b border-border/60 mb-1">
        {card.cardName}
      </div>

      {/* Add One */}
      {onAddOne && (
        <button
          onClick={() => {
            onAddOne();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Añadir una copia</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1 py-0.5 rounded">
            Alt+1
          </span>
        </button>
      )}

      {/* Add More... */}
      {onAddMore && (
        <button
          onClick={() => {
            onAddMore();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Añadir más...</span>
          </div>
        </button>
      )}

      {/* Remove */}
      {onRemove && (
        <button
          onClick={() => {
            onRemove();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar copia</span>
          </div>
          <span className="text-[10px] font-mono text-rose-400/80 bg-rose-950/40 px-1 py-0.5 rounded">
            Alt+2
          </span>
        </button>
      )}

      <div className="my-1 border-t border-border/60" />

      {/* Move to Sideboard / Mainboard */}
      {onToggleSideboard && (
        <button
          onClick={() => {
            onToggleSideboard();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-400" />
            <span>{card.isSideboard ? "Mover al Mainboard" : "Mover al Sideboard"}</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1 py-0.5 rounded">
            Alt+3
          </span>
        </button>
      )}

      <div className="my-1 border-t border-border/60" />

      {/* Change Tags */}
      {onChangeTags && (
        <button
          onClick={() => {
            onChangeTags();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-primary" />
            <span>Cambiar etiquetas</span>
          </div>
        </button>
      )}

      {/* View Details */}
      {onViewDetails && (
        <button
          onClick={() => {
            onViewDetails();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ver detalles</span>
          </div>
        </button>
      )}

      {/* Add to Wishlist */}
      {onAddToWants && (
        <button
          onClick={() => {
            onAddToWants();
            onClose();
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookmarkPlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Añadir a lista de deseos</span>
          </div>
        </button>
      )}

      {/* Copy Card Name */}
      <button
        onClick={handleCopyName}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span>{copied ? "¡Nombre copiado!" : "Copiar nombre"}</span>
        </div>
      </button>
    </div>
  );
}
