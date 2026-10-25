"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CardPreviewHover } from "@/components/card-preview-hover";
import { acceptDeckAssignmentNotice } from "@/actions/decks";
import type { DeckAssignmentNotice } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

export function DeckAssignmentNotices({ notices }: { notices: DeckAssignmentNotice[] }) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [isPendingAll, setIsPendingAll] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string>();
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const items = notices.filter((n) => !dismissedIds.has(n.id));
  if (!items.length) return null;

  const handleOpen = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 250);
  };

  async function acceptSingle(noticeId: string) {
    setPendingIds((prev) => new Set(prev).add(noticeId));
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[noticeId];
      return next;
    });
    setGlobalError(undefined);

    try {
      await acceptDeckAssignmentNotice(noticeId);
      setDismissedIds((prev) => new Set(prev).add(noticeId));
    } catch {
      setItemErrors((prev) => ({
        ...prev,
        [noticeId]: "No se pudo aceptar el aviso. Inténtalo de nuevo.",
      }));
      setGlobalError("No se pudo aceptar el aviso. Inténtalo de nuevo.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(noticeId);
        return next;
      });
    }
  }

  async function acceptAll() {
    setIsPendingAll(true);
    setGlobalError(undefined);

    const idsToAccept = items.map((item) => item.id);
    const successfulIds: string[] = [];

    await Promise.all(
      idsToAccept.map(async (id) => {
        try {
          await acceptDeckAssignmentNotice(id);
          successfulIds.push(id);
        } catch {
          // Keep as pending for retry
        }
      })
    );

    if (successfulIds.length > 0) {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        for (const id of successfulIds) {
          next.add(id);
        }
        return next;
      });
    }

    if (successfulIds.length < idsToAccept.length) {
      setGlobalError("No se pudieron aceptar algunos avisos. Inténtalo de nuevo.");
    }

    setIsPendingAll(false);
  }

  const count = items.length;
  const totalCards = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section aria-label="Cartas pendientes de introducir en mazos" className="mb-6">
      <div
        role="status"
        className="relative flex flex-row items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/20 to-transparent px-3 py-2 sm:px-4 text-sm text-foreground shadow-sm backdrop-blur-sm transition-all"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-amber-400"
          />

          <Tooltip.Provider delayDuration={100}>
            <Tooltip.Root open={open} onOpenChange={setOpen}>
              <Tooltip.Trigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Ver detalle de cartas pendientes de introducir"
                  aria-expanded={open}
                  onMouseEnter={handleOpen}
                  onMouseLeave={handleClose}
                  onFocus={handleOpen}
                  onBlur={handleClose}
                  onClick={() => setOpen((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen((prev) => !prev);
                    }
                  }}
                  className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer select-none group focus:outline-none"
                >
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    {count} {count === 1 ? "aviso" : "avisos"}
                  </span>

                  <span className="truncate text-xs sm:text-sm text-foreground">
                    {count === 1 ? (
                      <>
                        Introduce <strong className="text-white">{items[0].quantity} ×{" "}
                          <CardPreviewHover
                            cardName={items[0].cardName}
                            imageUri={items[0].imageUri}
                            className="underline decoration-dotted decoration-amber-400/80 hover:text-amber-300 font-bold"
                          >
                            {items[0].cardName}
                          </CardPreviewHover>
                        </strong> en el mazo{" "}
                        <span className="font-semibold text-amber-300 underline underline-offset-4 decoration-amber-500/40">
                          {items[0].deckName}
                        </span>
                      </>
                    ) : (
                      <>
                        Introduce <strong className="text-white">{totalCards} {totalCards === 1 ? "carta" : "cartas"}</strong> pendientes en tus mazos
                      </>
                    )}
                  </span>

                  <span className="text-xs text-amber-400/80 group-hover:text-amber-300 underline underline-offset-4 decoration-amber-500/40 hidden md:inline-flex items-center gap-0.5 shrink-0 ml-1">
                    (Pasa el cursor para ver detalles ▾)
                  </span>
                </div>
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  collisionPadding={16}
                  onMouseEnter={handleOpen}
                  onMouseLeave={handleClose}
                  className="z-50 w-full sm:w-[500px] max-w-[calc(100vw-32px)] rounded-xl border border-amber-500/30 bg-slate-900/95 p-4 text-xs text-foreground shadow-2xl backdrop-blur-md pointer-events-auto transition-all"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      <h4 className="font-semibold text-sm text-white">
                        Cartas pendientes de introducir ({items.length})
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      En uso en tus barajas
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {items.map((notice) => (
                      <div
                        key={notice.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/70 p-2.5 hover:border-amber-500/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px] border border-amber-500/20 shrink-0">
                              {notice.quantity} ×
                            </span>
                            <CardPreviewHover
                              cardName={notice.cardName}
                              imageUri={notice.imageUri}
                              className="font-semibold text-white truncate max-w-[180px] underline decoration-dotted decoration-amber-400/80 hover:text-amber-300 transition-colors"
                            >
                              <span
                                className="truncate block"
                                title={notice.cardName}
                              >
                                {notice.cardName}
                              </span>
                            </CardPreviewHover>
                            <span className="text-slate-400 text-[11px]">en</span>

                            <Link
                              href={`/decks/${notice.deckId}`}
                              className="font-medium text-amber-300 hover:text-amber-200 underline decoration-amber-500/40 underline-offset-2 truncate max-w-[140px]"
                              title={notice.deckName}
                            >
                              {notice.deckName}
                            </Link>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            La carta ya figura en uso en ese mazo.
                          </p>
                          {itemErrors[notice.id] && (
                            <p role="alert" className="mt-1 text-[11px] text-destructive font-medium">
                              {itemErrors[notice.id]}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingIds.has(notice.id)}
                          onClick={() => acceptSingle(notice.id)}
                          aria-label={`Aceptar aviso de ${notice.cardName} para ${notice.deckName}`}
                          className="h-7 px-2.5 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 shrink-0"
                        >
                          {pendingIds.has(notice.id) ? "Aceptando…" : "Aceptar"}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {items.length > 1 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>¿Confirmar todas de una vez?</span>
                      <button
                        onClick={acceptAll}
                        disabled={isPendingAll}
                        className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 focus:outline-none"
                      >
                        {isPendingAll ? "Aceptando todas…" : `Aceptar todas (${items.length})`}
                      </button>
                    </div>
                  )}

                  <Tooltip.Arrow className="fill-slate-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {globalError && (
            <span role="alert" className="text-xs text-destructive hidden lg:inline">
              {globalError}
            </span>
          )}
          {count > 1 ? (
            <Button
              size="sm"
              disabled={isPendingAll}
              onClick={acceptAll}
              aria-label="Aceptar todos los avisos de asignación"
              className="h-8 px-3.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              {isPendingAll ? "Aceptando…" : `Aceptar todas (${count})`}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pendingIds.has(items[0].id)}
              onClick={() => acceptSingle(items[0].id)}
              aria-label={`Aceptar aviso de ${items[0].cardName} para ${items[0].deckName}`}
              className="h-8 px-3.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              {pendingIds.has(items[0].id) ? "Aceptando…" : "Aceptar"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
