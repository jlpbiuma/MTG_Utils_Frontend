"use client";

import { TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { UpcomingReprint } from "@/lib/upcoming-reprints";

export function UpcomingReprintWarning({ reprints, compact = true }: { reprints?: UpcomingReprint[]; compact?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  reprints = reprints?.filter(reprint => /^\d{4}-\d{2}-\d{2}$/.test(reprint.releaseDate) && reprint.releaseDate > today);
  if (!reprints?.length) return null;
  const formatDate = (value: string) => new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const description = reprints.map(reprint => `${reprint.setName} (${reprint.setCode.toUpperCase()}), ${formatDate(reprint.releaseDate)}`).join("; ");
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" onClick={event => event.stopPropagation()} aria-label={`Reimpresión próxima: ${description}`} title={`Reimpresión próxima: ${description}`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md px-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
        {!compact && <span className="text-sm font-medium">Reimpresión próxima</span>}
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-sm space-y-2 text-sm">
      <DialogTitle className="font-semibold text-yellow-600 dark:text-yellow-400">Reimpresión anunciada</DialogTitle>
      <DialogDescription>Esta carta aparece en una próxima expansión. Tenlo en cuenta antes de comprar.</DialogDescription>
      <ul className="space-y-1">{reprints.map(reprint => <li key={reprint.setCode}><span className="font-medium">{reprint.setName}</span> ({reprint.setCode.toUpperCase()}) · <time dateTime={reprint.releaseDate}>{formatDate(reprint.releaseDate)}</time></li>)}</ul>
    </DialogContent>
  </Dialog>;
}
