"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateOffer } from "@/actions/purchases";
import {
  loadOfferReview,
  type SimulatedCollectionAnalysisResponse,
} from "@/actions/simulated-collections";
import { OfferCollectionDialog } from "@/components/offer-collection-dialog";
import { originLabels, type PurchaseOrigin } from "@/lib/acquisitions";

export function OfferControls({
  offer,
  onUpdated,
}: {
  offer: SimulatedCollectionAnalysisResponse;
  onUpdated: () => Promise<void>;
}) {
  const [origin, setOrigin] = useState<PurchaseOrigin>(offer.origin ?? "other");
  const [seller, setSeller] = useState(offer.seller ?? "");
  const [shipping, setShipping] = useState(String(offer.shipping ?? 0));
  const [url, setUrl] = useState(offer.sourceUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [review, setReview] =
    useState<SimulatedCollectionAnalysisResponse | null>(null);
  async function run(action: "save" | "confirm" | "discard" | "reopen") {
    if (!offer.id || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!Number.isFinite(Number(shipping)) || Number(shipping) < 0)
        throw new Error("Introduce un envío válido.");
      const nextOffer = {
        origin,
        seller: seller || null,
        shipping: origin === "cardmarket" ? Number(shipping) : 0,
        sourceUrl: url || null,
        paidTotal: offer.paidTotal ?? null,
        status: action === "discard" ? "discarded" as const : "evaluating" as const,
      };
      // Confirming an unchanged offer should open the same acquisition review
      // as the offers list without issuing a redundant PATCH first.
      const offerChanged =
        nextOffer.origin !== (offer.origin ?? "other") ||
        nextOffer.seller !== (offer.seller ?? null) ||
        nextOffer.shipping !== (offer.shipping ?? 0) ||
        nextOffer.sourceUrl !== (offer.sourceUrl ?? null) ||
        nextOffer.status !== (offer.status === "discarded" ? "discarded" : "evaluating");
      if (action !== "confirm" || offerChanged) {
        await updateOffer(offer.id, nextOffer);
      }
      if (action === "confirm") {
        const result = await loadOfferReview(offer.id);
        if (!result.ok) throw new Error(result.error);
        setReview(result.data);
      } else setMessage("Oferta guardada.");
      await onUpdated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la oferta.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Confirmación de oferta"
      className="space-y-4 rounded-xl border bg-card p-4"
    >
      <h3 className="font-semibold">
        {offer.status === "purchased"
          ? "Compra confirmada"
          : "Evaluar y confirmar compra"}
      </h3>
      {offer.status === "purchased" ? (
        <p className="text-sm">
          <Link href="/buy/expenses" className="underline">
            Consultar inversión y procedencia en Gastos e inversión
          </Link>
        </p>
      ) : (
        <>
          <label className="block text-sm">
            Origen de la oferta
            <select
              aria-label="Origen de la oferta"
              value={origin}
              disabled={busy}
              onChange={(e) => setOrigin(e.target.value as PurchaseOrigin)}
              className="block min-h-11 w-full rounded-md border bg-background px-3"
            >
              {Object.entries(originLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Vendedor
              <input
                value={seller}
                disabled={busy}
                onChange={(e) => setSeller(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              URL del anuncio (opcional)
              <input
                type="url"
                value={url}
                disabled={busy}
                onChange={(e) => setUrl(e.target.value)}
                className="block min-h-11 w-full rounded-md border bg-background px-3"
              />
            </label>
            {origin === "cardmarket" && (
              <label className="text-sm">
                Envío (€)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping}
                  disabled={busy}
                  onChange={(e) => setShipping(e.target.value)}
                  className="block min-h-11 w-full rounded-md border bg-background px-3"
                />
              </label>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {origin === "cardmarket"
              ? "Al confirmar, las cartas se añadirán a tu colección y se registrará la compra."
              : "Al confirmar se guarda el precio de tendencia mostrado como gasto estimado."}{" "}
            Las copias que necesiten tus mazos se asignarán automáticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run("save")}
            >
              Guardar oferta
            </Button>
            {offer.status === "discarded" ? (
              <Button disabled={busy} onClick={() => void run("reopen")}>
                Reabrir oferta
              </Button>
            ) : (
              <>
                <Button disabled={busy} onClick={() => void run("confirm")}>
                  Confirmar compra
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void run("discard")}
                >
                  Descartar
                </Button>
              </>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {review?.id && (
        <OfferCollectionDialog
          name={review.name}
          cards={review.cards}
          initialCost={review.cards.reduce((s, c) => s + c.totalPrice, 0)}
          selection={false}
          confirmationOnly
          finance={{
            offerId: review.id,
            origin: review.origin ?? "other",
            valuationRevision: review.valuationRevision,
          }}
          onClose={() => setReview(null)}
          onConfirm={async () => {
            setMessage("Compra registrada, inventario y mazos actualizados.");
            await onUpdated();
          }}
        />
      )}
    </section>
  );
}
