"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { getPurchaseProvenance } from "@/lib/reads";
import {
  euro,
  originLabels,
  type PurchaseOrigin,
  type PurchaseProvenance,
} from "@/lib/acquisitions";

export function CardPurchaseProvenance({
  collectionCardId,
}: {
  collectionCardId: string;
}) {
  const [items, setItems] = useState<PurchaseProvenance[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    getPurchaseProvenance(collectionCardId).then((result) => {
      if (!current) return;
      if (result.ok) setItems(result.data);
      else setError(result.error);
    });
    return () => {
      current = false;
    };
  }, [collectionCardId]);
  return (
    <section
      aria-label="Procedencia de las cartas"
      className="rounded-lg border p-3 space-y-2"
    >
      <h3 className="font-semibold">Procedencia de las cartas</h3>
      {error && <p role="alert">{error}</p>}
      {items === null && !error && <p>Cargando procedencia…</p>}
      {items?.length === 0 && (
        <p>
          Sin compras asociadas. Puedes registrarlas desde Gastos e inversión.
        </p>
      )}
      <ul className="space-y-2">
        {items?.map((item) => (
          <li key={item.id}>
            {item.quantity} copias · {item.name} ·{" "}
            {item.acquiredOn.slice(0, 10)} ·{" "}
            {originLabels[item.origin as PurchaseOrigin] ?? item.origin}
            {item.seller ? ` · ${item.seller}` : ""}
            <p>
              Coste atribuido: {euro(item.costAmount)}
              {item.costBasis === "trend" ? " (estimado)" : ""}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/buy/expenses"
        className="inline-block min-h-11 py-3 underline"
      >
        Ver gastos e inversión
      </Link>
    </section>
  );
}
