"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import type { DeckRequirement } from "@/lib/schemas";

export function RequestedDecksBadge({
  cardName,
  decks,
  count,
}: {
  cardName: string;
  decks?: DeckRequirement[];
  count?: number;
}) {
  const requested = decks ?? [];
  const requestedCount = count ?? requested.length;
  const [open, setOpen] = useState(false);

  if (requestedCount <= 0) return null;

  if (requested.length === 1) {
    const deck = requested[0];
    return (
      <Link
        href={`/decks/${deck.deckId}`}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60 hover:border-emerald-400 hover:text-emerald-100 transition-colors"
        title={`Ver mazo: ${deck.deckName} (${deck.completionPercentage ?? 0}% completado)`}
      >
        <Layers className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="truncate max-w-[150px]">En mazo: {deck.deckName}</span>
      </Link>
    );
  }

  const label = `En ${requestedCount} mazos`;

  return (
    <>
      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800/60 hover:border-indigo-400 hover:text-indigo-100 transition-colors"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cardName}</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <ul className="max-h-80 overflow-y-auto space-y-1">
            {requested.map((req) => (
              <li key={req.deckId}>
                <Link
                  href={`/decks/${req.deckId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2 text-sm hover:border-primary"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {req.colors && req.colors.length > 0 ? (
                      <ColorIdentityPips colors={req.colors} size="xs" />
                    ) : (
                      <span className="text-[10px] font-mono text-muted-foreground" title="Incoloro">
                        C
                      </span>
                    )}
                    <span className="text-foreground min-w-0 truncate">{req.deckName}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {req.completionPercentage ?? 0}% · {req.quantity}{" "}
                    {req.quantity === 1 ? "copia" : "copias"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
