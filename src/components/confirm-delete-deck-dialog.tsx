"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckName: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDeleteDeckDialog({
  open,
  onOpenChange,
  deckName,
  onConfirm,
}: ConfirmDeleteDeckDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
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
        className="sm:max-w-md border-slate-700/80 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Trash2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-xl font-bold text-slate-100">
              ¿Eliminar mazo permanentemente?
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-300">
              ¿Estás seguro de que deseas eliminar el mazo{" "}
              <span className="font-semibold text-rose-300">"{deckName}"</span>?
              Esta acción no se puede deshacer y se borrarán todas las cartas y asignaciones asociadas a este mazo.
            </DialogDescription>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
            className="border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-md shadow-rose-600/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar mazo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
