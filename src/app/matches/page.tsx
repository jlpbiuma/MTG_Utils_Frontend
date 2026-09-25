import { getWhatsAppMatches } from "@/actions/whatsapp-matches";
import { WhatsAppMatchesView } from "@/components/whatsapp-matches-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Oportunidades de Mercado — MTG Utils",
  description:
    "Cruce automático de ofertas y demandas de WhatsApp con tus Wants y Colección física.",
};

export default async function MatchesPage() {
  const matchesData = await getWhatsAppMatches();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <WhatsAppMatchesView initialData={matchesData} />
    </div>
  );
}
