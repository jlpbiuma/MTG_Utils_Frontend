"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { acceptDeckAssignmentNotice } from "@/actions/decks";
import type { DeckAssignmentNotice } from "@/lib/schemas";
import { Button } from "@/components/ui/button";

function AssignmentNotice({ notice }: { notice: DeckAssignmentNotice }) {
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  if (accepted) return null;

  async function accept() {
    setPending(true);
    setError(undefined);
    try {
      await acceptDeckAssignmentNotice(notice.id);
      setAccepted(true);
    } catch {
      setError("No se pudo aceptar el aviso. Inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
      <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-400" />
      <div className="flex-1 text-sm text-foreground">
        <p>Introduce <strong>{notice.quantity} × {notice.cardName}</strong> en el mazo <Link className="font-semibold underline underline-offset-4" href={`/decks/${notice.deckId}`}>{notice.deckName}</Link>.</p>
        <p className="mt-1 text-muted-foreground">La carta ya figura en uso en ese mazo.</p>
        {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
      </div>
      <Button className="min-h-11" disabled={pending} onClick={accept} aria-label={`Aceptar aviso de ${notice.cardName} para ${notice.deckName}`}>
        {pending ? "Aceptando…" : "Aceptar"}
      </Button>
    </div>
  );
}

export function DeckAssignmentNotices({ notices }: { notices: DeckAssignmentNotice[] }) {
  if (!notices.length) return null;
  return <section aria-label="Cartas pendientes de introducir en mazos" className="mb-6 space-y-3">
    {notices.map(notice => <AssignmentNotice key={notice.id} notice={notice} />)}
  </section>;
}
