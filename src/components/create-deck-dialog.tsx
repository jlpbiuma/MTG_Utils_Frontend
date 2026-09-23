"use client";

import React, { useState } from "react";
import { Plus, Layers, Loader2, Crown, Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDeck } from "@/actions/decks";

const MTG_FORMATS = [
  "Commander / EDH",
  "Modern",
  "Standard",
  "Pioneer",
  "Legacy",
  "Vintage",
  "Pauper",
  "Draft / Sealed",
  "Casual",
];

const DEFAULT_SUGGESTED_TAGS = [
  "Ramp",
  "Draw",
  "Removal",
  "Board Wipe",
  "Tutor",
  "Finisher",
  "Protection",
  "Combo",
  "Synergy",
];

export interface CreateDeckDialogProps {
  initialCommander?: string;
  initialName?: string;
  trigger?: React.ReactNode;
}

export function CreateDeckDialog({
  initialCommander = "",
  initialName = "",
  trigger,
}: CreateDeckDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [format, setFormat] = useState("Commander / EDH");
  const [commander, setCommander] = useState(initialCommander);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([
    "Ramp",
    "Draw",
    "Removal",
    "Board Wipe",
    "Tutor",
    "Finisher",
  ]);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (initialCommander && !commander) setCommander(initialCommander);
      if (initialName && !name) setName(initialName);
    }
  };

  const handleAddCustomTag = () => {
    const val = newTagInput.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setNewTagInput("");
    }
  };

  const toggleSuggestedTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del mazo es obligatorio");
      return;
    }

    if (format.includes("Commander") && !commander.trim()) {
      setError("El comandante es obligatorio para mazos de formato Commander.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createDeck({
        name: name.trim(),
        format,
        commander: commander.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      setName("");
      setCommander("");
      setDescription("");
      setTags(["Ramp", "Draw", "Removal", "Board Wipe", "Tutor", "Finisher"]);
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el mazo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="mana" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Mazo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Layers className="h-5 w-5 text-primary" />
            Crear Nuevo Mazo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre del Mazo *
            </label>
            <Input
              placeholder="ej: Urza Lord High Artificer Combo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Formato
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MTG_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-primary" />
              Comandante {format.includes("Commander") ? "*" : "(Opcional)"}
            </label>
            <Input
              placeholder="ej: Aragorn, the Uniter / Atraxa, Praetors' Voice"
              value={commander}
              onChange={(e) => setCommander(e.target.value)}
              className="border-border focus-visible:ring-ring"
              required={format.includes("Commander")}
            />
            <p className="text-[11px] text-muted-foreground">
              {format.includes("Commander")
                ? "Obligatorio para recomendaciones de EDHREC y análisis de comunidad."
                : "Opcional para formatos no-Commander."}
            </p>
          </div>

          {/* Tags section */}
          <div className="space-y-2 border-t border-b border-border py-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Tags / Categorías del Mazo</span>
              </label>
              <span className="text-[10px] text-muted-foreground">
                {tags.length} activas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 p-0.5 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Suggestions & Add Custom */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-muted-foreground font-medium">Sugeridas:</p>
              <div className="flex flex-wrap gap-1">
                {DEFAULT_SUGGESTED_TAGS.map((st) => {
                  const isSelected = tags.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleSuggestedTag(st)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        isSelected
                          ? "bg-secondary text-muted-foreground border-border opacity-50"
                          : "bg-background text-foreground border-border hover:border-primary"
                      }`}
                    >
                      + {st}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <Input
                placeholder="Nueva tag personalizada..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomTag}
                className="h-8 text-xs shrink-0"
              >
                Añadir
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descripción o Estrategia (Opcional)
            </label>
            <textarea
              placeholder="Notas sobre el mazo, combo principal o lista de deseos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="mana" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Crear Mazo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
