"use client";
import { useState } from "react";
import {
  prepareInventoryPurchase,
  commitPurchase,
} from "@/actions/acquisitions";
import { todayDate, type AcquisitionQuote } from "@/lib/acquisitions";
import { AcquisitionReview } from "@/components/acquisition-review";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function InventoryAcquisitionDialog({
  printingId,
  cardName,
  quantity,
  isFoil = false,
  onAdjustment,
  onSaved,
  onClose,
}: {
  printingId: string;
  cardName: string;
  quantity: number;
  isFoil?: boolean;
  onAdjustment: () => Promise<void>;
  onSaved: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState("adjustment");
  const [date, setDate] = useState(todayDate());
  const [quote, setQuote] = useState<AcquisitionQuote | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function review() {
    setBusy(true);
    setError("");
    const result = await prepareInventoryPurchase({
      printingId,
      quantity,
      isFoil,
      acquiredOn: date,
      name: `Compra de ${cardName}`,
    });
    if (result.ok) setQuote(result.data);
    else setError(result.error);
    setBusy(false);
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "purchase" && quote) {
        const result = await commitPurchase(quote.quoteId, ack);
        if (!result.ok) {
          if (result.budget) {
            setQuote({ ...quote, budget: result.budget });
            setAck(false);
          }
          throw new Error(result.error);
        }
      } else if (mode === "adjustment") await onAdjustment();
      else return;
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo añadir la carta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Incorporar cartas</DialogTitle>
          <DialogDescription>
            {quantity} × {cardName}
            {isFoil ? " · Foil" : ""}
          </DialogDescription>
        </DialogHeader>
        <label className="text-sm">
          Procedencia
          <select
            aria-label="Tipo de incorporación"
            value={mode}
            disabled={busy}
            onChange={(e) => {
              setMode(e.target.value);
              setQuote(null);
              setAck(false);
              setError("");
            }}
            className="block min-h-11 w-full rounded-md border bg-background px-3"
          >
            <option value="adjustment">
              Ajuste de inventario / regalo / cartas que ya tenía
            </option>
            <option value="purchase">
              Compra nueva (coste estimado por tendencia)
            </option>
          </select>
        </label>
        {mode === "purchase" ? (
          <>
            <label className="text-sm">
              Fecha de adquisición
              <input
                aria-label="Fecha de adquisición"
                type="date"
                value={date}
                max={todayDate()}
                disabled={busy}
                onChange={(e) => {
                  setDate(e.target.value);
                  setQuote(null);
                  setAck(false);
                }}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              />
            </label>
            {quote ? (
              <AcquisitionReview
                quote={quote}
                acknowledge={ack}
                onAcknowledge={setAck}
              />
            ) : (
              <Button
                disabled={busy || !date || date > todayDate()}
                onClick={() => void review()}
              >
                Revisar compra
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Se actualizará el inventario sin registrar un gasto. Para documentar
            una compra anterior, utiliza «Registrar compra antigua» en Gastos e
            inversión.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={
              busy ||
              (mode === "purchase" &&
                (!quote || (!!quote.budget.requiresAcknowledgement && !ack)))
            }
            onClick={() => void confirm()}
          >
            {busy ? "Registrando…" : "Confirmar incorporación"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
