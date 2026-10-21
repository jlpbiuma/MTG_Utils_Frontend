"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import { globalSearch, type SearchResult } from "@/actions/search";
import { Button } from "@/components/ui/button";
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [card, setCard] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      globalSearch(query)
        .then((data) => {
          if (active) setResults(data);
        })
        .catch(() => {
          if (active)
            setError("No se pudo buscar. Inténtalo de nuevo.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      active = false;
    };
  }, [query, open]);
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Buscar cartas, mazos y secciones (Cmd+K)"
        className="min-h-11"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Buscar ⌘K</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Buscar en MTG Utils</DialogTitle>
          <DialogDescription>
            Cartas del catálogo, tus mazos y secciones. Cmd+K / Ctrl+K.
          </DialogDescription>
          <input
            autoFocus
            aria-label="Buscar cartas, mazos y secciones"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-11 rounded-lg border border-input bg-background px-3"
            placeholder="Nombre de carta, mazo o sección…"
          />
          <div aria-live="polite" className="max-h-80 overflow-y-auto">
            {loading && <p className="p-3 text-sm">Buscando…</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && results.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                Sin resultados. Prueba otro nombre.
              </p>
            )}
            {results.map((result) =>
              result.href ? (
                <Link
                  key={`${result.kind}:${result.id}`}
                  href={result.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-between rounded-md p-3 hover:bg-muted"
                >
                  {result.name}
                  <span className="text-xs text-muted-foreground">
                    {result.kind}
                  </span>
                </Link>
              ) : (
                <button
                  key={result.id}
                  onClick={() => {
                    setCard(result);
                    setOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-md p-3 text-left hover:bg-muted"
                >
                  {result.name}
                  <span className="text-xs text-muted-foreground">Carta</span>
                </button>
              ),
            )}
          </div>
        </DialogContent>
      </Dialog>
      {card && (
        <CardDetailDialog
          isOpen
          onOpenChange={(value) => !value && setCard(null)}
          cardId={card.id}
          cardName={card.name}
        />
      )}
    </>
  );
}
