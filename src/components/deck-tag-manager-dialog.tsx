"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Tag,
  X,
  Plus,
  Sparkles,
  Layers,
  Trash2,
  Check,
  Globe,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DeckCardWithOwnership } from "@/lib/schemas";
import { updateDeckCardTags, updateDeckTags } from "@/actions/decks";

export const GLOBAL_TAGS = [
  "ramp",
  "removal",
  "draw",
  "boardwipe",
  "protection",
  "tutor",
  "finisher",
  "counterspell",
  "graveyard",
  "card-advantage",
  "mana-rock",
  "synergy",
];

interface DeckTagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: DeckCardWithOwnership | null;
  allCards: DeckCardWithOwnership[];
  deckId: string;
  deckTags?: string[];
  onTagsUpdated: (cardId: string, newTags: string[]) => void;
  onAllCardsUpdated?: (cards: DeckCardWithOwnership[]) => void;
}

export function DeckTagManagerDialog({
  open,
  onOpenChange,
  card,
  allCards,
  deckId,
  deckTags = [],
  onTagsUpdated,
  onAllCardsUpdated,
}: DeckTagManagerDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isManagingAll, setIsManagingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync tags when card changes
  useEffect(() => {
    if (card) {
      setSelectedTags(card.tags?.filter((t) => t.trim().length > 0) || []);
      setInputValue("");
      setIsManagingAll(false);
    }
  }, [card, open]);

  // Aggregate all tags across all cards in the deck
  const deckTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of allCards) {
      for (const t of c.tags || []) {
        const clean = t.trim();
        if (clean) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      }
    }
    return counts;
  }, [allCards]);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^#/, "");
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
    }
    setInputValue("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!card) return;
    setIsSaving(true);
    try {
      await updateDeckCardTags(card.id, selectedTags, deckId);
      onTagsUpdated(card.id, selectedTags);

      // Also ensure deckTags contains newly added tags
      const updatedDeckTags = Array.from(new Set([...deckTags, ...selectedTags]));
      await updateDeckTags(deckId, updatedDeckTags);

      onOpenChange(false);
    } catch (err) {
      console.error("Error saving tags:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete tag from all cards in the deck
  const handleDeleteTagFromDeck = async (tagToDelete: string) => {
    if (!confirm(`¿Eliminar la etiqueta "${tagToDelete}" de todas las cartas del mazo?`)) {
      return;
    }

    // Update each affected card
    const updatedCards = allCards.map((c) => {
      if (c.tags?.includes(tagToDelete)) {
        const newTags = c.tags.filter((t) => t !== tagToDelete);
        updateDeckCardTags(c.id, newTags, deckId).catch(console.error);
        return { ...c, tags: newTags };
      }
      return c;
    });

    if (onAllCardsUpdated) {
      onAllCardsUpdated(updatedCards);
    }

    if (card) {
      setSelectedTags((prev) => prev.filter((t) => t !== tagToDelete));
    }

    const newDeckTags = deckTags.filter((t) => t !== tagToDelete);
    await updateDeckTags(deckId, newDeckTags);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-bold text-foreground">
              {isManagingAll
                ? "Gestionar todas las etiquetas del mazo"
                : `Etiquetas para ${card?.cardName || "Carta"}`}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!isManagingAll ? (
          /* Single Card Tag Editor */
          <div className="space-y-5 py-2">
            {/* Custom tags input */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Etiquetas personalizadas
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Escribe una etiqueta y pulsa Enter (ej: ramp, draw)..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddTag(inputValue);
                    }
                  }}
                  className="bg-background text-xs h-9"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!inputValue.trim()}
                  onClick={() => handleAddTag(inputValue)}
                  className="h-9 px-3 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              </div>
            </div>

            {/* Currently assigned tags */}
            <div>
              <span className="text-xs text-muted-foreground block mb-2">
                Etiquetas asignadas a esta carta:
              </span>
              {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-secondary/40 border border-border/60 min-h-[44px]">
                  {selectedTags.map((tag) => {
                    const isGlobal = GLOBAL_TAGS.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant="outline"
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium ${
                          isGlobal
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-secondary text-foreground border-border"
                        }`}
                      >
                        {isGlobal ? <Globe className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-muted-foreground hover:text-foreground p-0.5 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic bg-secondary/30 p-3 rounded-xl border border-dashed border-border/60">
                  Esta carta no tiene ninguna etiqueta asignada aún.
                </p>
              )}
            </div>

            {/* Global tags quick-pick */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold">Etiquetas globales recomendadas:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GLOBAL_TAGS.map((gt) => {
                  const isSelected = selectedTags.includes(gt);
                  return (
                    <button
                      key={gt}
                      onClick={() => (isSelected ? handleRemoveTag(gt) : handleAddTag(gt))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <span>{gt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanatory notes matching Image 2 */}
            <div className="text-[11px] text-muted-foreground space-y-1 bg-secondary/30 p-3 rounded-xl border border-border/40">
              <p>• Las etiquetas se muestran como categorías en la vista de mazo agrupada por tipo y tags.</p>
              <p>• Usa etiquetas globales como <strong>ramp</strong>, <strong>removal</strong> o <strong>draw</strong> para estandarizar tus categorías.</p>
              <p className="text-primary/90 font-medium pt-1">
                💡 Atajo: Pulsa <strong>Shift + Click</strong> en cualquier carta para abrir esta ventana directamente.
              </p>
            </div>
          </div>
        ) : (
          /* Manage All Deck Tags View */
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Todas las etiquetas utilizadas en las cartas de este mazo:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {Object.keys(deckTagCounts).length > 0 ? (
                Object.entries(deckTagCounts).map(([tagName, count]) => (
                  <div
                    key={tagName}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{tagName}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        ({count} {count === 1 ? "carta" : "cartas"})
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteTagFromDeck(tagName)}
                      className="text-muted-foreground hover:text-rose-400 p-1 rounded hover:bg-rose-950/30 transition-colors"
                      title="Eliminar de todo el mazo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  No hay ninguna etiqueta en este mazo todavía.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between pt-3 border-t border-border/70 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsManagingAll(!isManagingAll)}
            className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            {isManagingAll ? "← Volver a la carta" : "Gestionar todas las etiquetas"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            {!isManagingAll && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
