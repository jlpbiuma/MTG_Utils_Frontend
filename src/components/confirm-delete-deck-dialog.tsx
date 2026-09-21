"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRightLeft,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getDeckDeletionImpact,
  type DeckDeletionImpact,
  type DominoCandidate,
} from "@/actions/decks";

interface ConfirmDeleteDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId?: string;
  deckName: string;
  onConfirm: (
    reassignments?: { targetDeckCardId: string; quantity: number }[]
  ) => Promise<void> | void;
}

export function ConfirmDeleteDeckDialog({
  open,
  onOpenChange,
  deckId,
  deckName,
  onConfirm,
}: ConfirmDeleteDeckDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingImpact, setIsLoadingImpact] = useState(false);
  const [impactData, setImpactData] = useState<DeckDeletionImpact | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (open && deckId) {
      setIsLoadingImpact(true);
      getDeckDeletionImpact(deckId)
        .then((res) => {
          setImpactData(res);
          if (res.dominoCandidates && res.dominoCandidates.length > 0) {
            // Select all domino candidates by default
            setSelectedCandidates(res.dominoCandidates.map((c) => c.targetDeckCardId));
          }
        })
        .catch((err) => {
          console.error("Error loading deletion impact:", err);
        })
        .finally(() => {
          setIsLoadingImpact(false);
        });
    } else {
      setImpactData(null);
      setSelectedCandidates([]);
    }
  }, [open, deckId]);

  const toggleCandidate = (targetDeckCardId: string) => {
    if (selectedCandidates.includes(targetDeckCardId)) {
      setSelectedCandidates(selectedCandidates.filter((id) => id !== targetDeckCardId));
    } else {
      setSelectedCandidates([...selectedCandidates, targetDeckCardId]);
    }
  };

  const handleConfirmWithReassign = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const reassignments = (impactData?.dominoCandidates || [])
        .filter((c) => selectedCandidates.includes(c.targetDeckCardId))
        .map((c) => ({
          targetDeckCardId: c.targetDeckCardId,
          quantity: c.neededQuantity,
        }));
      await onConfirm(reassignments);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al eliminar el mazo"
      );
      setIsDeleting(false);
    }
  };

  const handleConfirmDirect = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm([]);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al eliminar el mazo"
      );
      setIsDeleting(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDeleting) {
      setErrorMessage(null);
      onOpenChange(false);
    }
  };

  const dominoList = impactData?.dominoCandidates || [];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isDeleting) {
          if (!nextOpen) setErrorMessage(null);
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-lg border-border bg-popover max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-semibold text-foreground">
              ¿Eliminar mazo permanentemente?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas eliminar el mazo{" "}
              <span className="font-semibold text-rose-300">"{deckName}"</span>?
            </DialogDescription>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Domino Effect Section */}
        {isLoadingImpact ? (
          <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Comprobando cartas asignadas y efecto dominó...</span>
          </div>
        ) : dominoList.length > 0 ? (
          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-indigo-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-indigo-300">
                <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Efecto dominó detectado</span>
              </div>
              <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                Este mazo tiene cartas asignadas que son pedidas por otros mazos incompletos.
                Puedes asignarlas automáticamente a continuación para avanzar su completitud.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-48 border border-border rounded-lg p-2 bg-background/50">
              {dominoList.map((c) => {
                const isSelected = selectedCandidates.includes(c.targetDeckCardId);
                return (
                  <div
                    key={c.targetDeckCardId}
                    onClick={() => toggleCandidate(c.targetDeckCardId)}
                    className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-700/60 text-foreground"
                        : "bg-secondary/30 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold truncate">{c.cardName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span>→</span>
                      <span className="font-semibold text-foreground truncate max-w-[120px]">
                        {c.targetDeckName}
                      </span>
                      <span className="text-muted-foreground">
                        ({c.targetDeckCompletion}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Las cartas que tengas asignadas en este mazo quedarán liberadas en tu inventario general sin asignar.
          </p>
        )}

        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2 mt-4 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            className="border-border bg-secondary hover:bg-accent text-foreground order-last sm:order-first"
          >
            Cancelar
          </Button>

          <div className="flex flex-col sm:flex-row gap-2">
            {dominoList.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleConfirmDirect}
                disabled={isDeleting}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Solo liberar al pool
              </Button>
            )}

            <Button
              type="button"
              variant="destructive"
              onClick={
                dominoList.length > 0
                  ? handleConfirmWithReassign
                  : handleConfirmDirect
              }
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Eliminando...</span>
                </>
              ) : dominoList.length > 0 && selectedCandidates.length > 0 ? (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>
                    Eliminar y reasignar ({selectedCandidates.length})
                  </span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Eliminar mazo</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
