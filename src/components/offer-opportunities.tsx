"use client";

import { useState } from "react";
import type { WhatsAppMatchesResponse } from "@/actions/whatsapp-matches";
import { OpportunityCompletion, OpportunityLinkGroups, OpportunityValue } from "@/components/opportunity-link-groups";
import type { OpportunitySelection } from "@/lib/opportunity-selection";

/** Selection, export and contact belong to the same offer detail as valuation. */
export function OfferOpportunities({ data }: { data: WhatsAppMatchesResponse }) {
  const [selection, setSelection] = useState<OpportunitySelection>({});
  const matches = [...data.wants_matches, ...data.collection_matches];
  return <section aria-label="Coincidencias de la oferta" className="space-y-4">
    <h3 className="text-lg font-semibold">Coincidencias y selección</h3>
    <p className="text-sm text-muted-foreground">{data.total_cards_scanned} cartas analizadas · {data.total_wants_matches} coincidencias para comprar · {data.total_collection_matches} coincidencias para vender</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <OpportunityValue matches={matches} selection={selection} label="Valor de la selección" summary />
      <OpportunityValue matches={matches} selection={selection} label="Valor de tendencia de la selección" metric="trend" summary />
      {data.wants_matches.length > 0 && <OpportunityCompletion matches={matches} selection={selection} deckCount={data.global_deck_count ?? 0} before={data.global_completion_before ?? 0} label="Completitud global con la selección" summary />}
    </div>
    <OpportunityLinkGroups matches={matches} allMatches={matches} selection={selection}
      onSelectionChange={changes => setSelection(previous => ({ ...previous, ...changes }))}
      view="list" deckCount={data.global_deck_count ?? 0} completionBefore={data.global_completion_before ?? 0}
      renderCard={(match, controls) => <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-medium">{match.card_name}</p>
            <p className="text-xs text-muted-foreground">{match.matched_want?.requested_decks.join(", ") || (match.matched_collection ? `${match.matched_collection.quantity_owned} copias en colección · ${match.matched_collection.available_quantity} libres` : "")}</p>
            {match.detected_at && <p className="text-xs text-muted-foreground">Detectada: {new Date(match.detected_at).toLocaleString("es-ES")}</p>}
            {match.condition && <p className="text-xs text-muted-foreground">Estado: {match.condition}</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-primary">
            {match.whatsapp_url.startsWith("https://") && <a href={match.whatsapp_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Ver lista original</a>}
            {match.direct_whatsapp_link.startsWith("https://wa.me/") && <a href={match.direct_whatsapp_link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline">Contactar por WhatsApp</a>}
          </div>
        </div>
        {controls}
      </div>} />
    {matches.length === 0 && <p className="text-sm text-muted-foreground">Esta oferta no contiene coincidencias con tus necesidades o copias disponibles.</p>}
  </section>;
}
