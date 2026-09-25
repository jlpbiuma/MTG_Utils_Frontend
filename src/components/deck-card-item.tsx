"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle, Pencil, Crown, ShoppingCart, Archive, ArchiveRestore, Flame } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DeckWithCompletion } from "@/lib/schemas";
import { deleteDeck, archiveDeck } from "@/actions/decks";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import { ConfirmDeleteDeckDialog } from "@/components/confirm-delete-deck-dialog";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { formatPrice } from "@/lib/deck-colors";
import { CardImage as Image } from "@/components/card-image";

interface DeckCardItemProps {
  deck: DeckWithCompletion;
}

export function DeckCardItem({ deck }: DeckCardItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentName, setCurrentName] = useState(deck.name);
  const [currentFormat, setCurrentFormat] = useState(deck.format);
  const [currentDescription, setCurrentDescription] = useState(deck.description);
  const [currentCommander, setCurrentCommander] = useState(deck.commander);
  const [currentCommanderImageUri, setCurrentCommanderImageUri] = useState(deck.commanderImageUri);
  const [isArchived, setIsArchived] = useState(!!deck.isArchived);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleConfirmDelete = async (
    reassignments?: { targetDeckCardId: string; quantity: number }[]
  ) => {
    await deleteDeck(deck.id, reassignments);
  };

  const handleToggleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isArchiving) return;
    setIsArchiving(true);
    const nextState = !isArchived;
    setIsArchived(nextState);
    try {
      await archiveDeck(deck.id, nextState);
    } catch (err) {
      console.error("Error toggling archive status:", err);
      setIsArchived(!nextState);
    } finally {
      setIsArchiving(false);
    }
  };

  const isComplete = deck.totalCards > 0 && deck.missingCardsCount === 0;

  const missingValue = deck.missingValue ?? 0;
  const ownedValue =
    deck.ownedValue ??
    (deck.totalValue != null
      ? Math.max(0, Math.round((deck.totalValue - missingValue) * 100) / 100)
      : 0);

  const isCommanderFormat =
    !currentFormat ||
    /^(commander\s*(\/\s*edh)?|edh)$/i.test(currentFormat.trim());

  return (
    <Card className={`flex flex-col group hover:border-border transition-all duration-300 relative overflow-hidden ${isArchived ? "opacity-85 border-dashed" : ""}`}>
      {/* Subtle top indicator based on completion */}
      <div
        className={`h-1 w-full transition-all duration-300 ${
          isComplete
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : deck.completionPercentage > 50
            ? "bg-primary"
            : "bg-muted"
        }`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {!isCommanderFormat && (
              <Badge variant="outline" className="bg-background/60 text-[11px] font-mono border-border text-primary">
                {currentFormat}
              </Badge>
            )}
            {deck.totalCards !== 100 && (
              <Badge
                variant="outline"
                className={`text-[11px] font-mono flex items-center gap-1 ${
                  deck.totalCards > 100
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
                title={deck.totalCards > 100 ? "El mazo supera las 100 cartas reglamentarias" : "El mazo tiene menos de 100 cartas"}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{deck.totalCards}/100</span>
              </Badge>
            )}
            {deck.isCommanderTop100 && (
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                title={`Este comandante pertenece al Top 100 de EDHREC${deck.commanderEdhrecRank ? ` (puesto #${deck.commanderEdhrecRank})` : ""}`}
              >
                <Flame className="h-3 w-3 text-amber-400 shrink-0" />
                <span>Top 100 EDHREC{deck.commanderEdhrecRank ? ` #${deck.commanderEdhrecRank}` : ""}</span>
              </Badge>
            )}
            {isArchived && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-medium">
                Archivado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              disabled={isArchiving}
              onClick={handleToggleArchive}
              title={isArchived ? "Desarchivar mazo" : "Archivar mazo"}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent disabled:opacity-50"
            >
              {isArchived ? (
                <ArchiveRestore className="h-3.5 w-3.5 text-amber-500 hover:text-amber-400" />
              ) : (
                <Archive className="h-3.5 w-3.5 hover:text-amber-500" />
              )}
            </button>
            <EditDeckDialog
              deck={{
                id: deck.id,
                name: currentName,
                format: currentFormat,
                description: currentDescription,
                commander: currentCommander,
              }}
              onUpdated={(updated) => {
                setCurrentName(updated.name);
                setCurrentFormat(updated.format);
                setCurrentDescription(updated.description);
                if (updated.commander !== undefined) setCurrentCommander(updated.commander);
                if (updated.commanderImageUri !== undefined) setCurrentCommanderImageUri(updated.commanderImageUri);
              }}
              trigger={
                <button
                  type="button"
                  title="Editar mazo"
                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-accent"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              title="Eliminar mazo"
              className="text-muted-foreground hover:text-rose-400 transition-colors p-1 rounded hover:bg-accent"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1 mt-1">
          {currentName}
        </CardTitle>

        {currentCommander ? (
          <div className="flex items-center gap-1.5 text-xs text-foreground mt-1 truncate">
            <Crown className="h-3 w-3 text-primary shrink-0" />
            <span className="text-muted-foreground text-[11px]">Comandante:</span>
            <span className="font-semibold text-foreground truncate">{currentCommander}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mt-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Sin comandante asignado</span>
          </div>
        )}

        {currentDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
            {currentDescription}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {/* Imagen destacada que ocupa todo el espacio */}
        <Link
          href={`/decks/${deck.id}`}
          className="relative block h-52 sm:h-56 w-full rounded-lg overflow-hidden bg-background border border-border hover:border-primary/30 transition-all duration-300 mb-3 group/preview"
        >
          {currentCommanderImageUri ? (
            <>
              <Image
                src={currentCommanderImageUri}
                alt={currentCommander || currentName}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="w-full h-full object-cover object-top group-hover/preview:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary gap-2">
              <div className="p-3 rounded-full bg-card border border-border text-muted-foreground group-hover/preview:text-primary group-hover/preview:border-primary/30 transition-colors">
                <Crown className="h-7 w-7" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                {currentCommander ? currentCommander : "Sin comandante asignado"}
              </span>
            </div>
          )}
        </Link>

        <div className="space-y-3 p-3 rounded-lg bg-secondary border border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Completitud del mazo</span>
            <span
              className={`font-bold font-mono text-sm ${
                isComplete
                  ? "text-emerald-400"
                  : deck.completionPercentage > 50
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              {deck.completionPercentage}%
            </span>
          </div>

          <Progress
            value={deck.completionPercentage}
            indicatorClassName={
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-primary"
            }
          />

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
            <span className="text-muted-foreground">
              <strong className="text-foreground font-mono">{deck.ownedCards}</strong> /{" "}
              <span className="font-mono">{deck.totalCards}</span> cartas
            </span>

            {isComplete ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡Completado!
              </span>
            ) : deck.missingCardsCount > 0 ? (
              <span className="flex items-center gap-1 text-rose-400 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                Faltan {deck.missingCardsCount}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px]">Sin cartas aún</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-border">
            <span className="flex items-center gap-1.5 min-w-0">
              <ColorIdentityPips colors={deck.colors} size="md" />
            </span>

            {deck.totalValue != null && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    <ShoppingCart className="h-3 w-3 inline mr-1 text-primary" />
                    Neto Total
                  </span>
                  <span
                    className="font-mono font-semibold text-primary truncate"
                    title="Precio neto total estimado del mazo (precios de tendencia)"
                  >
                    {formatPrice(deck.totalValue, deck.currencySymbol)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-muted-foreground">Faltantes</span>
                  <span
                    className="font-mono font-semibold text-rose-400 truncate"
                    title="Coste de las cartas que faltan para completar el mazo"
                  >
                    {formatPrice(missingValue, deck.currencySymbol)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-muted-foreground">Posesión</span>
                  <span
                    className="font-mono font-semibold text-emerald-400 truncate"
                    title="Valor de la parte del mazo que ya tienes en tu colección"
                  >
                    {formatPrice(ownedValue, deck.currencySymbol)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild variant="outline" className="w-full justify-between group/btn hover:border-primary/30 hover:bg-accent">
          <Link href={`/decks/${deck.id}`}>
            <span className="group-hover/btn:text-primary">Ver Mazo y Faltantes</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/btn:text-primary transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </CardFooter>

      <ConfirmDeleteDeckDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        deckId={deck.id}
        deckName={currentName}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
