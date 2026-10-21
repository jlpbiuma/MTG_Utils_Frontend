"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { prepareOfferPurchase, commitPurchase } from "@/actions/acquisitions";
import { AcquisitionReview } from "@/components/acquisition-review";
import {
  todayDate,
  type AcquisitionQuote,
  type PurchaseOrigin,
} from "@/lib/acquisitions";

export function OfferCollectionDialog({
  finance,
  name,
  cards,
  initialCost,
  shipping = 0,
  fixedCost = false,
  selection,
  confirmationOnly = false,
  onClose,
  onConfirm,
}: {
  finance?: {
    offerId: string;
    valuationRevision?: string | null;
    origin: PurchaseOrigin;
    cardNames?: string[];
  };
  name: string;
  cards: { cardName: string; quantity: number }[];
  initialCost: number;
  shipping?: number;
  fixedCost?: boolean;
  selection: boolean;
  confirmationOnly?: boolean;
  onClose: () => void;
  onConfirm: (date: string, cost: number) => Promise<void>;
}) {
  const [cost, setCost] = useState(String(initialCost));
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Atlantic/Canary",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<AcquisitionQuote | null>(null);
  const [ack, setAck] = useState(false);
  const [reviewing, setReviewing] = useState(!!finance);
  const validReviewDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayDate();
  // Cardmarket purchase prices are part of the imported offer snapshot. The
  // API uses those values when purchasePrices is omitted.
  useEffect(() => {
    if (!finance || !validReviewDate) return;
    let current = true;
    void prepareOfferPurchase(finance.offerId, {
      acquiredOn: date,
      cardNames: finance.cardNames,
      valuationRevision: finance.valuationRevision,
      purchasePrices: {},
    })
      .then((result) => {
        if (!current) return;
        setReviewing(false);
        if (result.ok) setQuote(result.data);
        else setError(result.error);
      })
      .catch(() => {
        if (!current) return;
        setReviewing(false);
        setError("No se pudo preparar la confirmación de compra. Inténtalo de nuevo.");
      });
    return () => {
      current = false;
    };
  }, [finance, date, validReviewDate]);
  function invalidate() {
    setReviewing(true);
    setQuote(null);
    setAck(false);
    setError(null);
  }
  const copies = cards.reduce((total, card) => total + card.quantity, 0);
  const valid =
    cost.trim() !== "" &&
    Number.isFinite(Number(cost)) &&
    Number(cost) >= 0 &&
    !!date;
  async function confirm() {
    if (
      busy ||
      !valid ||
      (finance &&
        (!quote || reviewing || (!confirmationOnly && quote.budget.requiresAcknowledgement && !ack)))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      if (finance && quote) {
        const result = await commitPurchase(quote.quoteId, confirmationOnly || ack);
        if (!result.ok) {
          if (result.budget) {
            setQuote({ ...quote, budget: result.budget });
            setAck(false);
          }
          throw new Error(result.error);
        }
        await onConfirm(date, Number(quote.subtotal));
      } else await onConfirm(date, Number(cost));
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron añadir las cartas a la colección.",
      );
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
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {confirmationOnly ? "Confirmar compra" : "Añadir a colección"}
          </DialogTitle>
          <DialogDescription>
            {confirmationOnly
              ? `¿Confirmas que has comprado «${name}» y quieres añadirla a tu colección?`
              : `${selection ? "Añadir las cartas seleccionadas" : "Añadir todas las cartas"} de «${name}» a tu colección física.`}
          </DialogDescription>
        </DialogHeader>
        {!confirmationOnly && <>
        <p className="text-sm font-medium">
          {cards.length} nombres · {copies} {copies === 1 ? "copia" : "copias"}
        </p>
        <ul
          aria-label="Cartas a añadir"
          className="max-h-48 overflow-y-auto rounded-md border border-border p-3 text-sm space-y-1"
        >
          {cards.map((card) => (
            <li key={card.cardName}>
              {card.quantity}× {card.cardName}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {selection
            ? "Las cartas seleccionadas saldrán de la oferta; las restantes seguirán disponibles."
            : "La oferta quedará marcada como comprada."}{" "}
          Se actualizará la lista de compra y se registrará un lote de
          adquisición.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            Fecha de adquisición
            <input
              aria-label="Fecha de adquisición"
              type="date"
              value={date}
              disabled={busy}
              max={todayDate()}
              onChange={(event) => {
                invalidate();
                setDate(event.target.value);
              }}
              className="w-full min-h-11 rounded-md border border-input bg-background px-3"
            />
          </label>
          {!finance && (
            <label className="text-sm space-y-1">
              Coste de las cartas (€)
              <input
                aria-label="Coste de las cartas (€)"
                type="number"
                min="0"
                step="0.01"
                value={cost}
                disabled={busy || fixedCost}
                onChange={(event) => setCost(event.target.value)}
                className="w-full min-h-11 rounded-md border border-input bg-background px-3"
              />
            </label>
          )}
        </div>
        {!finance && fixedCost && (
          <p className="text-sm text-muted-foreground">
            Venta presencial: precio de tendencia de la edición seleccionada.
          </p>
        )}
        {!finance && (
          <p className="text-sm tabular-nums">
            Envío: {shipping.toFixed(2)} € · Total:{" "}
            {valid ? (Number(cost) + shipping).toFixed(2) : "—"} €
          </p>
        )}
        {finance?.origin === "cardmarket" && (
          <p className="text-sm text-muted-foreground">
            Se usarán los precios pagados importados con la oferta.
          </p>
        )}
        {finance && !validReviewDate && <p role="alert" className="text-sm text-destructive">Introduce una fecha válida que no sea posterior a hoy.</p>}
        {reviewing && validReviewDate && <p role="status">Preparando valoración y presupuesto…</p>}
        {quote && (
          <AcquisitionReview
            quote={quote}
            acknowledge={ack}
            onAcknowledge={setAck}
          />
        )}
        </>}
        {confirmationOnly && reviewing && <p role="status">Preparando la confirmación…</p>}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={
              busy ||
              !valid ||
              !cards.length ||
              (!!finance &&
                (!quote ||
                  reviewing ||
                  (!confirmationOnly && !!quote.budget.requiresAcknowledgement && !ack)))
            }
            onClick={() => void confirm()}
          >
            {busy
              ? confirmationOnly ? "Confirmando…" : "Añadiendo…"
              : confirmationOnly ? "Sí, confirmar compra" : "Confirmar incorporación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
