"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCollectionImportProgress } from "@/actions/import";

const LAST_IMPORT_STORAGE_KEY = "mtg-collection-last-import";

interface StoredImport {
  importId: string;
  unique?: number;
}

export function EnrichmentProgressBanner() {
  const [stored, setStored] = useState<StoredImport | null>(null);
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getCollectionImportProgress>> | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem(LAST_IMPORT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredImport;
        if (parsed?.importId && active) setStored(parsed);
      }
    } catch {
      // storage unavailable or corrupted; no persistent import
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!stored || dismissed) return;
    stoppedRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (cancelled) return;
      try {
        const value = await getCollectionImportProgress(stored.importId);
        if (cancelled) return;
        setProgress(value);
        if (value.pending === 0) {
          stoppedRef.current = true;
          try { localStorage.removeItem(LAST_IMPORT_STORAGE_KEY); } catch { /* storage unavailable */ }
          setStored(null);
          return;
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? String(err.message) : "";
        if (message.includes("404")) {
          stoppedRef.current = true;
          try { localStorage.removeItem(LAST_IMPORT_STORAGE_KEY); } catch { /* storage unavailable */ }
          setStored(null);
          return;
        }
      }
      if (!cancelled) timer = setTimeout(poll, 4000);
    };

    void poll();
    return () => { cancelled = true; clearTimeout(timer); stoppedRef.current = true; };
  }, [stored, dismissed]);

  if (!stored || dismissed || !progress) return null;

  const total = stored.unique && stored.unique > 0 ? stored.unique : 1;
  const done = progress.completed + progress.notFound + progress.ambiguous + progress.failed;
  const percent = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="sticky top-14 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <Link href="/collection" className="flex-1 min-w-0 group">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground truncate">
              {progress.pending > 0 ? (
                <>
                  <Loader2 className="h-3 w-3 inline animate-spin mr-1.5 -mt-0.5 text-foreground" />
                  <span className="font-medium text-foreground">Enriqueciendo colección</span>
                  <span className="font-mono tabular-nums"> · {done}/{total}</span>
                  {progress.pending > 0 && (
                    <span className="text-muted-foreground"> · {progress.pending} pendientes</span>
                  )}
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Colección lista</span>
                  <span className="font-mono tabular-nums"> · {done}/{total}</span>
                </>
              )}
            </p>
            <span className="shrink-0 font-mono tabular-nums text-xs text-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="mt-1.5 h-1" />
        </Link>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Ocultar progreso de importación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}