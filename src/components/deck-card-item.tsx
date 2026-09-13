"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trash2, ExternalLink, CheckCircle2, AlertCircle, Pencil, Crown, ShoppingCart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DeckWithCompletion } from "@/lib/schemas";
import { deleteDeck } from "@/actions/decks";
import { EditDeckDialog } from "@/components/edit-deck-dialog";
import { ConfirmDeleteDeckDialog } from "@/components/confirm-delete-deck-dialog";
import { ColorIdentityPips } from "@/components/color-identity-pips";
import { formatPrice, buildColorIdentity } from "@/lib/deck-colors";
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

  const handleConfirmDelete = async () => {
    await deleteDeck(deck.id);
  };

  const isComplete = deck.totalCards > 0 && deck.missingCardsCount === 0;

  const missingValue = deck.missingValue ?? 0;
  const ownedValue =
    deck.ownedValue ??
    (deck.totalValue != null
      ? Math.max(0, Math.round((deck.totalValue - missingValue) * 100) / 100)
      : 0);

  return (
    <Card className="flex flex-col group hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 relative overflow-hidden">
      {/* Subtle top indicator based on completion */}
      <div
        className={`h-1 w-full transition-all duration-300 ${
          isComplete
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : deck.completionPercentage > 50
            ? "bg-gradient-to-r from-amber-500 to-yellow-400"
            : "bg-gradient-to-r from-slate-700 to-amber-600/50"
        }`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="bg-slate-950/60 text-[11px] font-mono border-slate-700 text-amber-300">
            {currentFormat}
          </Badge>
          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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
                  className="text-slate-400 hover:text-amber-300 transition-colors p-1 rounded hover:bg-slate-800/60"
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
              className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-800/60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <CardTitle className="text-lg group-hover:text-amber-300 transition-colors line-clamp-1 mt-1">
          {currentName}
        </CardTitle>

        {currentCommander ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1 truncate">
            <Crown className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px]">Comandante:</span>
            <span className="font-semibold text-slate-200 truncate">{currentCommander}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mt-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Sin comandante asignado</span>
          </div>
        )}

        {currentDescription && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
            {currentDescription}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        {/* Imagen destacada que ocupa todo el espacio */}
        <Link
          href={`/decks/${deck.id}`}
          className="relative block h-52 sm:h-56 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 transition-all duration-300 mb-3 group/preview shadow-md"
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
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 gap-2">
              <div className="p-3 rounded-full bg-slate-900/80 border border-slate-800 text-slate-500 group-hover/preview:text-amber-400 group-hover/preview:border-amber-500/30 transition-colors">
                <Crown className="h-7 w-7" />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {currentCommander ? currentCommander : "Sin comandante asignado"}
              </span>
            </div>
          )}
        </Link>

        <div className="space-y-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Completitud del mazo</span>
            <span
              className={`font-bold font-mono text-sm ${
                isComplete
                  ? "text-emerald-400"
                  : deck.completionPercentage > 50
                  ? "text-amber-300"
                  : "text-slate-300"
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
                : "bg-gradient-to-r from-amber-500 to-amber-300"
            }
          />

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/40">
            <span className="text-slate-400">
              <strong className="text-slate-200 font-mono">{deck.ownedCards}</strong> /{" "}
              <span className="font-mono">{deck.totalCards}</span> cartas
            </span>

            {isComplete ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ¡Completado!
              </span>
            ) : deck.missingCardsCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-400/90 text-[11px]">
                <AlertCircle className="h-3.5 w-3.5" />
                Faltan {deck.missingCardsCount}
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">Sin cartas aún</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-800/40">
            <span className="flex items-center gap-1.5 min-w-0">
              <ColorIdentityPips colors={deck.colors} />
              {deck.colors && deck.colors.length > 0 && (
                <span className="font-mono text-[11px] text-slate-500 truncate">
                  {deck.colorIdentity || buildColorIdentity(deck.colors)}
                </span>
              )}
            </span>

            {deck.totalValue != null && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/40">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-slate-400">
                    <ShoppingCart className="h-3 w-3 inline mr-1 text-amber-400" />
                    Neto Total
                  </span>
                  <span
                    className="font-mono font-semibold text-amber-300 truncate"
                    title="Precio neto total estimado del mazo (precios de tendencia)"
                  >
                    {formatPrice(deck.totalValue, deck.currencySymbol)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-slate-400">Faltantes</span>
                  <span
                    className="font-mono font-semibold text-rose-400 truncate"
                    title="Coste de las cartas que faltan para completar el mazo"
                  >
                    {formatPrice(missingValue, deck.currencySymbol)}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-slate-400">Posesión</span>
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
        <Button asChild variant="outline" className="w-full justify-between group/btn hover:border-amber-500/50 hover:bg-slate-800/80">
          <Link href={`/decks/${deck.id}`}>
            <span className="group-hover/btn:text-amber-300">Ver Mazo y Faltantes</span>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover/btn:text-amber-300 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
        </Button>
      </CardFooter>

      <ConfirmDeleteDeckDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        deckName={currentName}
        onConfirm={handleConfirmDelete}
      />
    </Card>
  );
}
