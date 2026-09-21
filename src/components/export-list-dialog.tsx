"use client";

import React, { useState, useMemo } from "react";
import { Download, Copy, Check, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ExportCardItem {
  cardName: string;
  quantity: number;
}

interface ExportListDialogProps {
  cards: ExportCardItem[];
  allCards?: ExportCardItem[];
  title?: string;
  description?: string;
  triggerText?: string;
  fileNamePrefix?: string;
}

export function ExportListDialog({
  cards,
  allCards,
  title = "Exportar Lista",
  description = "Lista en formato de texto estándar (1 Carta). Compatible con Moxfield, Archidekt, MTGO y tiendas.",
  triggerText = "Exportar lista",
  fileNamePrefix = "lista",
}: ExportListDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportScope, setExportScope] = useState<"current" | "all">("current");

  const hasDifferentAll = Boolean(
    allCards &&
      allCards.length > 0 &&
      (allCards.length !== cards.length ||
        allCards.reduce((s, c) => s + c.quantity, 0) !==
          cards.reduce((s, c) => s + c.quantity, 0))
  );

  const activeCards = exportScope === "all" && allCards ? allCards : cards;

  // Consolidate card quantities by normalized card name and sort alphabetically
  const consolidatedList = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeCards) {
      const name = item.cardName.trim();
      if (!name) continue;
      map.set(name, (map.get(name) ?? 0) + (item.quantity || 1));
    }

    return Array.from(map.entries())
      .map(([cardName, quantity]) => ({ cardName, quantity }))
      .sort((a, b) => a.cardName.localeCompare(b.cardName));
  }, [activeCards]);

  const totalCopies = useMemo(
    () => consolidatedList.reduce((acc, c) => acc + c.quantity, 0),
    [consolidatedList]
  );

  const formattedText = useMemo(() => {
    return consolidatedList.map((c) => `${c.quantity} ${c.cardName}`).join("\n");
  }, [consolidatedList]);

  const handleCopy = async () => {
    if (!formattedText) return;
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  const handleDownload = () => {
    if (!formattedText) return;
    const blob = new Blob([formattedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${fileNamePrefix}-${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-border hover:bg-accent text-xs h-9"
          title="Exportar en formato de texto plano (1 Carta)"
        >
          <Download className="h-4 w-4" />
          <span>{triggerText}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scope selector if filters are active */}
        {hasDifferentAll && (
          <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setExportScope("current")}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-colors ${
                exportScope === "current"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Filtro actual ({cards.length} cartas)
            </button>
            <button
              type="button"
              onClick={() => setExportScope("all")}
              className={`flex-1 py-1.5 px-3 rounded-md font-medium transition-colors ${
                exportScope === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Total completo ({allCards?.length} cartas)
            </button>
          </div>
        )}

        {/* Counters badge */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Total:{" "}
            <strong className="text-foreground font-mono">{totalCopies}</strong>{" "}
            {totalCopies === 1 ? "copia" : "copias"} (
            <strong className="text-foreground font-mono">
              {consolidatedList.length}
            </strong>{" "}
            únicas)
          </span>
          <span className="font-mono text-[11px] text-muted-foreground/80">
            Formato: &lt;cantidad&gt; &lt;nombre&gt;
          </span>
        </div>

        {/* Textarea with generated list */}
        <div className="relative flex-1 min-h-[220px]">
          <textarea
            readOnly
            value={formattedText}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            className="w-full h-full min-h-[220px] max-h-[50vh] p-3 font-mono text-xs leading-relaxed bg-background/80 rounded-lg border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none selection:bg-primary/20"
            placeholder="No hay cartas para exportar"
          />
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!formattedText}
              className="gap-1.5 text-xs border-border hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar .txt</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              disabled={!formattedText}
              className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 min-w-[130px]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  <span className="text-emerald-300 font-medium">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar lista</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
