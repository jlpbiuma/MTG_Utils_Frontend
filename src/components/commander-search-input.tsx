"use client";

import { useEffect, useId, useState } from "react";
import { searchCards, type ScryfallCardResult } from "@/actions/scryfall";
import { CardImage } from "@/components/card-image";
import { Input } from "@/components/ui/input";

export function CommanderSearchInput({ value, onChange, required }: {
  value: string;
  onChange: (name: string) => void;
  required: boolean;
}) {
  const id = useId();
  const [selectedName, setSelectedName] = useState(value);
  const [result, setResult] = useState<{ query: string; cards: ScryfallCardResult[]; failed?: boolean }>();
  const query = value.trim();
  const searching = query.length >= 2 && value !== selectedName;
  const pending = searching && result?.query !== query;

  useEffect(() => {
    if (!searching) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchCards(query);
        if (active) {
          const cards = response.data.filter((card, index, all) =>
            all.findIndex((candidate) => candidate.name === card.name) === index
          ).slice(0, 5);
          setResult({ query, cards });
        }
      } catch {
        if (active) setResult({ query, cards: [], failed: true });
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searching]);

  return (
    <div className="space-y-2">
      <Input
        aria-label="Comandante"
        aria-describedby={`${id}-status`}
        placeholder="Escribe al menos 2 letras del comandante"
        value={value}
        onChange={(event) => {
          setSelectedName("");
          setResult(undefined);
          onChange(event.target.value);
        }}
        autoComplete="off"
        required={required}
      />
      <p id={`${id}-status`} role="status" className="text-xs text-muted-foreground">
        {pending ? "Buscando cartas…" : searching && result?.query === query
          ? result.failed ? "No se pudo buscar. Vuelve a intentarlo."
            : result.cards.length ? "Elige una carta de las sugerencias."
              : "No se encontraron cartas. Prueba con otro nombre."
          : value && value === selectedName ? `Comandante: ${value}` : "Busca por nombre y elige tu comandante."}
      </p>
      {searching && !pending && result && result.cards.length > 0 && (
        <ul aria-label="Cartas sugeridas" className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-border p-1">
          {result.cards.map((card) => {
            const image = card.image_uris?.small || card.image_uris?.normal
              || card.card_faces?.[0]?.image_uris?.small || card.card_faces?.[0]?.image_uris?.normal;
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-md p-2 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    setSelectedName(card.name);
                    onChange(card.name);
                  }}
                >
                  {image ? <CardImage src={image} alt="" width={32} height={44} sizes="32px" className="h-11 w-8 shrink-0 rounded object-cover" />
                    : <span aria-hidden="true" className="flex h-11 w-8 shrink-0 items-center justify-center rounded bg-secondary text-[9px]">MTG</span>}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{card.name}</span>
                    <span className="block text-xs text-muted-foreground">{card.type_line}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
