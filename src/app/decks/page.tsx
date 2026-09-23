import { CheckCircle2, Coins, Wallet, ShoppingCart, Layers, Archive, Sparkles } from "lucide-react";
import { getDecksWithCompletion } from "@/actions/decks";
import { CreateDeckDialog } from "@/components/create-deck-dialog";
import { ImportDeckDialog } from "@/components/import-deck-dialog";
import { DeckListView } from "@/components/deck-list-view";
import { EdhrecRecommendationsView } from "@/components/edhrec-recommendations-view";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/deck-colors";

export const dynamic = "force-dynamic";

export default async function DecksPage({ searchParams }: {
  searchParams?: Promise<{ tab?: string }>;
} = {}) {
  const tab = (await searchParams)?.tab;
  const allDecks = await getDecksWithCompletion();

  const activeDecks = allDecks.filter((d) => !d.isArchived);
  const archivedDecks = allDecks.filter((d) => !!d.isArchived);

  // Financial & count KPIs calculated for active decks
  const totalDecks = activeDecks.length;
  const completedDecks = activeDecks.filter(
    (d) => d.totalCards > 0 && d.missingCardsCount === 0
  ).length;
  const totalCardsInDecks = activeDecks.reduce((sum, d) => sum + d.totalCards, 0);
  const avgCompletion =
    totalDecks > 0
      ? Math.round(
          (activeDecks.reduce((sum, d) => sum + d.completionPercentage, 0) /
            totalDecks) *
            10
        ) / 10
      : 0;

  const currencySymbol = activeDecks.find((d) => d.currencySymbol)?.currencySymbol || "€";

  const totalNetValue =
    Math.round(
      activeDecks.reduce((sum, d) => sum + (d.totalValue ?? 0), 0) * 100
    ) / 100;

  const totalMissingValue =
    Math.round(
      activeDecks.reduce((sum, d) => sum + (d.missingValue ?? 0), 0) * 100
    ) / 100;

  const totalOwnedValue =
    Math.round(
      activeDecks.reduce((sum, d) => {
        const missing = d.missingValue ?? 0;
        const owned =
          d.ownedValue ??
          (d.totalValue != null ? Math.max(0, d.totalValue - missing) : 0);
        return sum + owned;
      }, 0) * 100
    ) / 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Mis Mazos de Magic
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona tus listas de barajas, supervisa su completitud contra tu inventario y descubre nuevos comandantes recomendados.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ImportDeckDialog />
          <CreateDeckDialog />
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue={tab === "edhrec" ? "edhrec" : "my-decks"} className="w-full space-y-6 mt-6">
        <TabsList className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl h-11 flex-wrap">
          <TabsTrigger value="my-decks" className="gap-2 text-xs sm:text-sm px-4">
            <Layers className="h-4 w-4 text-primary" />
            <span>Mis mazos</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 font-mono text-slate-300">
              {activeDecks.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="archived" className="gap-2 text-xs sm:text-sm px-4">
            <Archive className="h-4 w-4 text-amber-500/80" />
            <span>Archivados</span>
            {archivedDecks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 font-mono text-slate-300">
                {archivedDecks.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="edhrec"
            className="gap-2 text-xs sm:text-sm px-4 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Recomendaciones EDHREC</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Mis mazos (Active Decks) */}
        <TabsContent value="my-decks" className="space-y-8 mt-0 focus-visible:ring-0">
          {/* Financial Valuation KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Valor Neto Total */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Valor Neto Total
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-2 tracking-tight">
                {formatPrice(totalNetValue, currencySymbol)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Valor de mercado combinado de tus mazos activos
              </p>
            </div>

            {/* Valor en Posesión */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-lg shadow-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Valor en Posesión
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
                {formatPrice(totalOwnedValue, currencySymbol)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Valor de las cartas que ya tienes en tu colección
              </p>
            </div>

            {/* Valor Faltante */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-md relative overflow-hidden group hover:border-rose-500/40 transition-all shadow-lg shadow-rose-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Valor Faltante
                </span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-2 tracking-tight">
                {formatPrice(totalMissingValue, currencySymbol)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Coste estimado para completar tus mazos activos
              </p>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Mazos</p>
              <p className="text-2xl font-black text-slate-100 font-mono mt-1">{totalDecks}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mazos Completados</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-black text-emerald-400 font-mono">{completedDecks}</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completitud Media</p>
              <p className="text-2xl font-black text-amber-300 font-mono mt-1">{avgCompletion}%</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cartas Requeridas</p>
              <p className="text-2xl font-black text-sky-400 font-mono mt-1">{totalCardsInDecks}</p>
            </div>
          </div>

          {/* Active Decks Grid */}
          <DeckListView decks={activeDecks} isArchivedView={false} />
        </TabsContent>

        {/* Tab 2: Archivados */}
        <TabsContent value="archived" className="space-y-6 mt-0 focus-visible:ring-0">
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-500" />
              Mazos Archivados ({archivedDecks.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los mazos archivados se almacenan aquí y quedan excluidos de las estadísticas y métricas de valor de tu colección. Puedes desarchivarlos en cualquier momento.
            </p>
          </div>

          <DeckListView decks={archivedDecks} isArchivedView={true} />
        </TabsContent>

        {/* Tab 3: Recomendaciones EDHREC */}
        <TabsContent value="edhrec" className="space-y-6 mt-0 focus-visible:ring-0">
          <EdhrecRecommendationsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
