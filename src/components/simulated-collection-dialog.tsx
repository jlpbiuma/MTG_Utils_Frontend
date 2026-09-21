"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Coins,
  TrendingUp,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Save,
  Trash2,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { CardDetailDialog } from "@/components/card-detail-dialog";
import {
  analyzeRawSimulatedCollection,
  createSimulatedCollection,
  getSimulatedCollection,
  deleteSimulatedCollection,
  type SimulatedCollectionAnalysisResponse,
  type SimulatedCardAnalysisItem,
} from "@/actions/simulated-collections";
import { isBasicLand } from "@/lib/card-utils";

interface SimulatedCollectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string | null;
  onSaved?: (savedId?: string) => void;
  onDeleted?: () => void;
  provider?: string;
}

export function SimulatedCollectionDialog({
  isOpen,
  onOpenChange,
  collectionId,
  onSaved,
  onDeleted,
  provider = "cardmarket",
}: SimulatedCollectionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rawText, setRawText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<SimulatedCollectionAnalysisResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<SimulatedCardAnalysisItem | null>(null);
  const [activeStep, setActiveStep] = useState<"input" | "results">("input");
  const [cardFilter, setCardFilter] = useState<"all" | "new" | "owned" | "useful" | "sellable">("all");


  // Load existing collection when collectionId is passed
  useEffect(() => {
    if (isOpen && collectionId) {
      setIsLoading(true);
      setError(null);
      getSimulatedCollection(collectionId, provider)
        .then((res) => {
          setAnalysis(res);
          setName(res.name);
          setDescription(res.description || "");
          setActiveStep("results");
        })
        .catch((err) => {
          setError(err?.message || "No se pudo cargar la colección simulada.");
        })
        .finally(() => setIsLoading(false));
    } else if (isOpen && !collectionId) {
      // Reset for new creation
      setName("");
      setDescription("");
      setRawText("");
      setAnalysis(null);
      setError(null);
      setSuccessMessage(null);
      setActiveStep("input");
      setExpandedCards({});
    }
  }, [isOpen, collectionId, provider]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        if (!name) {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          setName(fileNameWithoutExt);
        }
      }
    };
    reader.readAsText(file);
  };

  // Run simulation analysis on-the-fly
  const handleAnalyze = async () => {
    if (!rawText.trim()) {
      setError("Introduce al menos una carta para simular.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await analyzeRawSimulatedCollection(rawText, provider);
      if (res.cards.length === 0) {
        setError("No se pudieron interpretar cartas válidas en el texto proporcionado.");
        setIsLoading(false);
        return;
      }
      res.name = name.trim() || "Colección Simulada";
      res.description = description.trim() || null;
      setAnalysis(res);
      setActiveStep("results");
    } catch (err: any) {
      setError(err?.message || "Error al analizar la simulación.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save the simulated collection
  const handleSave = async () => {
    if (!name.trim()) {
      setError("Debes indicar un nombre para la colección simulada.");
      return;
    }
    if (!analysis || analysis.cards.length === 0) {
      setError("No hay cartas analizadas para guardar.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // If we don't have rawText (e.g. re-saving), re-construct raw text from cards
      const textToSave =
        rawText.trim() ||
        analysis.cards.map((c) => `${c.quantity} ${c.cardName}`).join("\n");

      const saved = await createSimulatedCollection(
        name.trim(),
        description.trim() || undefined,
        textToSave,
        provider
      );
      setAnalysis(saved);
      onOpenChange(false);
      if (onSaved) onSaved(saved.id ?? undefined);
    } catch (err: any) {
      setError(err?.message || "Error al guardar la colección simulada.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved collection
  const handleDelete = async () => {
    if (!collectionId) return;
    if (!confirm("¿Seguro que deseas eliminar esta colección simulada?")) return;

    setIsDeleting(true);
    try {
      await deleteSimulatedCollection(collectionId);
      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Error al eliminar la colección simulada.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (cardName: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardName]: !prev[cardName] }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border border-border shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-secondary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <FlaskConical className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                    {collectionId ? "Detalles de Colección Simulada" : "Nueva Colección Simulada"}
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5 font-mono">
                      Simulación
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Las cartas simuladas no se introducen en tu inventario real ni afectan a tus mazos.
                  </DialogDescription>
                </div>
              </div>

              {activeStep === "results" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveStep("input")}
                  className="text-xs gap-1.5 h-8 border-border"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Editar Cartas
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {activeStep === "input" ? (
              /* Step 1: Input & Configuration */
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Nombre de la colección simulada *
                    </label>
                    <Input
                      placeholder="Ej. Lote Wallapop 50 cartas, Cambio Pedro..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 bg-secondary/50 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Descripción o nota (opcional)
                    </label>
                    <Input
                      placeholder="Ej. Oferta 20€ negociable, incluye tierras raras..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="h-10 bg-secondary/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Boxes className="h-4 w-4 text-primary" />
                      Listado de cartas a simular (Moxfield, Arena, Texto plano)
                    </label>
                    <label className="cursor-pointer text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Subir archivo .txt</span>
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={10}
                    placeholder={`1 Sol Ring\n2 Arcane Signet\n1 Demonic Tutor\n4 Lightning Bolt\n1 Rhystic Study`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full rounded-xl p-3.5 text-sm font-mono bg-secondary/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Soporta formatos estándar de exportación: <code>1 Sol Ring</code> o <code>4x Lightning Bolt (CLB) 123</code>.
                  </p>
                </div>
              </div>
            ) : (
              /* Step 2: Live Analysis & Dashboard */
              analysis && (
                <div className="space-y-6">
                  {/* Hero Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Metric 1: Importe Económico Total */}
                    <div className="p-3.5 rounded-xl border border-border bg-card/60 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-xs font-medium">Valor Total Lote</span>
                        <Coins className="h-4 w-4 text-amber-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-tight">
                        {analysis.totalEconomicValue.toFixed(2)} {analysis.currencySymbol}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {analysis.totalCards} cartas
                      </p>
                    </div>

                    {/* Metric 2: Importe Sin Contar Ya Existentes */}
                    <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-xs font-medium text-amber-300">Sin Ya Existentes</span>
                        <Coins className="h-4 w-4 text-amber-300" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 tracking-tight">
                        {analysis.economicValueExcludingOwned.toFixed(2)} {analysis.currencySymbol}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {analysis.totalCards - analysis.alreadyOwnedCardsCount} cartas
                      </p>
                    </div>

                    {/* Metric 3: Valor vendible (Azul) */}
                    <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-xs font-medium text-blue-400">Valor vendible</span>
                        <Coins className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400 tracking-tight">
                        {analysis.sellableValue.toFixed(2)} {analysis.currencySymbol}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {analysis.sellableCardsCount} cartas
                      </p>
                    </div>

                    {/* Metric 4: Completitud Conseguida (Solo útiles a mazos) */}
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-xs font-medium text-emerald-400">Completitud</span>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                        +{analysis.globalNetGain.toFixed(2)}%
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {analysis.usefulCardsCount} cartas
                      </p>
                    </div>
                  </div>

                  {/* Warning banner reaffirming simulation isolation */}
                  <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs text-primary">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span>
                        Simulación calculada contra tu colección real y tus mazos activos.
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {analysis.uniqueCards} cartas únicas analizadas
                    </span>
                  </div>

                  {/* Cards Breakdown List with Filters */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Desglose por Carta ({analysis.cards.length})
                      </h4>

                      {/* Filter pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant={cardFilter === "all" ? "secondary" : "ghost"}
                          onClick={() => setCardFilter("all")}
                          className="h-7 text-xs px-2.5 rounded-full"
                        >
                          Todas ({analysis.cards.length})
                        </Button>
                        <Button
                          size="sm"
                          variant={cardFilter === "useful" ? "secondary" : "ghost"}
                          onClick={() => setCardFilter("useful")}
                          className="h-7 text-xs px-2.5 rounded-full text-primary"
                        >
                          Aportan a mazos ({analysis.cards.filter((c) => c.usefulCopies > 0 && c.copiesOwnedReal === 0 && !isBasicLand(c.typeLine, c.cardName)).length})
                        </Button>
                        <Button
                          size="sm"
                          variant={cardFilter === "sellable" ? "secondary" : "ghost"}
                          onClick={() => setCardFilter("sellable")}
                          className="h-7 text-xs px-2.5 rounded-full text-blue-400"
                        >
                          Vendibles ({analysis.cards.filter((c) => c.sellableCopies > 0).length})
                        </Button>
                        <Button
                          size="sm"
                          variant={cardFilter === "new" ? "secondary" : "ghost"}
                          onClick={() => setCardFilter("new")}
                          className="h-7 text-xs px-2.5 rounded-full text-emerald-400"
                        >
                          Nuevas ({analysis.cards.filter((c) => c.copiesOwnedReal === 0).length})
                        </Button>
                        <Button
                          size="sm"
                          variant={cardFilter === "owned" ? "secondary" : "ghost"}
                          onClick={() => setCardFilter("owned")}
                          className="h-7 text-xs px-2.5 rounded-full text-amber-400"
                        >
                          Ya en colección ({analysis.cards.filter((c) => c.copiesOwnedReal > 0).length})
                        </Button>
                      </div>
                    </div>

                    <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card/40">
                      {analysis.cards
                        .filter((card) => {
                          if (cardFilter === "new") return card.copiesOwnedReal === 0;
                          if (cardFilter === "owned") return card.copiesOwnedReal > 0;
                          if (cardFilter === "useful") return card.usefulCopies > 0 && card.copiesOwnedReal === 0 && !isBasicLand(card.typeLine, card.cardName);
                          if (cardFilter === "sellable") return card.sellableCopies > 0;
                          return true;
                        })
                        .map((card) => {
                          const isExpanded = !!expandedCards[card.cardName];
                          const isAlreadyOwned = card.copiesOwnedReal > 0;
                          const isBasic = isBasicLand(card.typeLine, card.cardName);
                          const hasDecks = card.candidateDecks && card.candidateDecks.length > 0 && !isAlreadyOwned && !isBasic;

                          return (
                            <div key={card.cardName} className="p-3.5 hover:bg-secondary/30 transition-colors">
                              <div className="flex items-center justify-between gap-3">
                                {/* Left: Thumbnail & Name (Clickable for CardDetailDialog) */}
                                <div
                                  onClick={() => setSelectedCardForDetail(card)}
                                  className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                                  title="Ver detalles y reimpresiones de la carta"
                                >
                                  <div className="relative w-9 h-12 rounded bg-background border border-border overflow-hidden shrink-0 group-hover:border-primary transition-colors">
                                    {card.imageUri ? (
                                      <Image
                                        src={card.imageUri}
                                        alt={card.cardName}
                                        fill
                                        sizes="36px"
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="truncate">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                        {card.cardName}
                                      </span>
                                      <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-mono">
                                        {card.quantity}x
                                      </Badge>
                                      {isAlreadyOwned ? (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-400 bg-amber-500/10 font-mono"
                                        >
                                          Ya en colección: {card.copiesOwnedReal}x
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-mono"
                                        >
                                          Nueva en colección
                                        </Badge>
                                      )}
                                      {card.sellableCopies > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-400 bg-blue-500/10 font-mono"
                                        >
                                          Vendible: {card.sellableCopies}x ({card.sellableValue.toFixed(2)} {analysis.currencySymbol})
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
                                      <span>{card.typeLine || "Carta"}</span>
                                      {card.setCode && (
                                        <span className="uppercase font-mono text-[10px] bg-secondary px-1 rounded">
                                          {card.setCode}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Metrics & Candidate Decks */}
                                <div className="flex items-center gap-3 shrink-0">

                                {/* Price */}
                                <div className="text-right">
                                  <div className="text-sm font-mono font-semibold text-amber-400">
                                    {card.totalPrice.toFixed(2)} {analysis.currencySymbol}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {card.unitPrice.toFixed(2)} {analysis.currencySymbol}/ud
                                  </div>
                                </div>

                                {/* Net Gain Badge */}
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-mono ${
                                    card.netCompletionGain > 0
                                      ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                      : "border-border text-muted-foreground"
                                  }`}
                                >
                                  +{card.netCompletionGain.toFixed(2)}% neto
                                </Badge>

                                {/* Candidate Decks Button */}
                                {hasDecks ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleExpand(card.cardName)}
                                    className="h-8 text-xs font-normal gap-1.5 border border-border hover:bg-secondary"
                                  >
                                    <span className="font-semibold text-primary">
                                      {card.candidateDeckCount}{" "}
                                      {card.candidateDeckCount === 1 ? "mazo" : "mazos"}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic px-2">
                                    Sin mazos
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Candidate Decks Expanded Panel */}
                            {isExpanded && hasDecks && (
                              <div className="mt-3 pt-3 border-t border-border/60 pl-12 space-y-2 animate-in slide-in-from-top-1 duration-200">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                                  Mazos que necesitan esta carta:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {card.candidateDecks.map((deck) => (
                                    <div
                                      key={deck.deckId}
                                      className="p-2.5 rounded-lg border border-border/80 bg-secondary/50 flex items-center justify-between text-xs"
                                    >
                                      <div>
                                        <p className="font-medium text-foreground">{deck.deckName}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          Completitud: {deck.completionPercentage.toFixed(1)}% • Pide {deck.requestedQuantity} (falta {deck.missingQuantity})
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-[11px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shrink-0"
                                      >
                                        +{deck.potentialGain.toFixed(1)}% mazo
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
            <div>
              {collectionId && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-1.5 h-9 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? "Eliminando..." : "Eliminar Colección"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs border-border"
              >
                Cerrar
              </Button>

              {activeStep === "input" ? (
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="gap-2 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <FlaskConical className="h-4 w-4" />
                      <span>Simular y Analizar Lote</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2 h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSaving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Guardar Colección Simulada</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Details Modal when clicking any card thumbnail or name */}
      {selectedCardForDetail && (
        <CardDetailDialog
          isOpen={Boolean(selectedCardForDetail)}
          onOpenChange={(open) => !open && setSelectedCardForDetail(null)}
          cardId={selectedCardForDetail.cardScryfallId || undefined}
          cardName={selectedCardForDetail.cardName}
          imageUri={selectedCardForDetail.imageUri}
          manaCost={selectedCardForDetail.manaCost}
          typeLine={selectedCardForDetail.typeLine}
          quantity={selectedCardForDetail.quantity}
          ownedInCollection={selectedCardForDetail.copiesOwnedReal}
        />
      )}
    </>
  );
}
