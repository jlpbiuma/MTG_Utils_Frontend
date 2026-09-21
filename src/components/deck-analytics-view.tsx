"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BarChart3,
  Calculator,
  Flame,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sliders,
  Layers,
  Sparkles,
  Droplet,
  Crown,
  Info,
  Scale,
  Compass,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ManaCost } from "@/components/mana-cost";
import type { DeckCardWithOwnership } from "@/lib/schemas";
import {
  analyzeManaCurve,
  analyzeTypeDistribution,
  analyzeManaBaseAndColors,
  getOpeningHandProbabilities,
  calculateCommanderOnCurve,
  calculateHypergeometric,
  parseManaValue,
} from "@/lib/deck-analytics";

interface DeckAnalyticsViewProps {
  cards: DeckCardWithOwnership[];
  colors?: string[] | null;
}

export function DeckAnalyticsView({ cards, colors }: DeckAnalyticsViewProps) {
  // Mana Curve State & Options
  const [excludeLands, setExcludeLands] = useState<boolean>(true);
  const [excludeCommander, setExcludeCommander] = useState<boolean>(true);
  const [curveStackMode, setCurveStackMode] = useState<"type" | "color">("type");

  const curveData = useMemo(() => {
    return analyzeManaCurve(cards, { excludeLands, excludeCommander });
  }, [cards, excludeLands, excludeCommander]);

  // Type Distribution
  const typeDistribution = useMemo(() => {
    return analyzeTypeDistribution(cards);
  }, [cards]);

  // Mana Base & Color Imbalance Analysis
  const manaBase = useMemo(() => {
    return analyzeManaBaseAndColors(cards, curveData.avgCmcWithoutLands, colors);
  }, [cards, curveData.avgCmcWithoutLands, colors]);

  // Commander detection
  const commanderCard = useMemo(() => {
    return cards.find((c) => c.isCommander && !c.isSideboard);
  }, [cards]);

  const commanderCmc = useMemo(() => {
    return commanderCard ? parseManaValue(commanderCard.manaCost) : 4;
  }, [commanderCard]);

  // Opening Hand & Interactive Land Slider State
  const totalDeckCards = useMemo(() => {
    return cards.reduce((sum, c) => (c.isSideboard ? sum : sum + (c.quantity || 1)), 0) || 99;
  }, [cards]);

  const currentLands = manaBase.totalLands || 36;
  const [simulatedLands, setSimulatedLands] = useState<number>(currentLands);

  // Sync simulatedLands if deck lands change
  React.useEffect(() => {
    setSimulatedLands(manaBase.totalLands || 36);
  }, [manaBase.totalLands]);

  const currentHandProbs = useMemo(() => {
    return getOpeningHandProbabilities(totalDeckCards, currentLands);
  }, [totalDeckCards, currentLands]);

  const simulatedHandProbs = useMemo(() => {
    return getOpeningHandProbabilities(totalDeckCards, simulatedLands);
  }, [totalDeckCards, simulatedLands]);

  const commanderOnCurve = useMemo(() => {
    return calculateCommanderOnCurve(totalDeckCards, simulatedLands, commanderCmc);
  }, [totalDeckCards, simulatedLands, commanderCmc]);

  // Custom Hypergeometric Calculator State
  const [popN, setPopN] = useState<number>(totalDeckCards);
  const [successK, setSuccessK] = useState<number>(currentLands);
  const [sampleN, setSampleN] = useState<number>(7);
  const [desiredK, setDesiredK] = useState<number>(3);

  const customHyperResult = useMemo(() => {
    return calculateHypergeometric(popN, successK, sampleN, desiredK);
  }, [popN, successK, sampleN, desiredK]);

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* SECCIÓN 1 — Curva de Maná y Composición por Tipo (Horizontal Compacto)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Curva de Maná */}
        <div className="xl:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                Curva de Maná y Distribución
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desglose de costes con apilado configurable.
              </p>
            </div>

            {/* Controls: Stack Mode Toggle + Exclude Toggles + Dynamic Average CMC */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Stacking Mode Toggle */}
              <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border">
                <button
                  onClick={() => setCurveStackMode("type")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    curveStackMode === "type"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Tipo
                </button>
                <button
                  onClick={() => setCurveStackMode("color")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    curveStackMode === "color"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Color
                </button>
              </div>

              {/* Filter Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setExcludeLands(!excludeLands)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    excludeLands
                      ? "bg-secondary text-foreground border-primary/40 font-semibold"
                      : "bg-background text-muted-foreground border-border hover:bg-secondary/40"
                  }`}
                >
                  {excludeLands ? "✓ Sin Tierras" : "Con Tierras"}
                </button>

                <button
                  onClick={() => setExcludeCommander(!excludeCommander)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    excludeCommander
                      ? "bg-secondary text-foreground border-primary/40 font-semibold"
                      : "bg-background text-muted-foreground border-border hover:bg-secondary/40"
                  }`}
                >
                  {excludeCommander ? "✓ Sin Cdte." : "Con Cdte."}
                </button>
              </div>

              {/* Metric badge */}
              <div className="flex items-center gap-2 bg-secondary/60 px-2.5 py-1 rounded-lg border border-border shrink-0">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">CMC:</span>
                <span className="text-sm font-bold font-mono text-primary">{curveData.avgCmc}</span>
              </div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-64 sm:h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
              <BarChart
                data={curveData.curve}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.25} />
                <XAxis dataKey="cmc" stroke="#888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />

                {curveStackMode === "type" ? (
                  <>
                    <Bar dataKey="creatures" name="Criaturas" stackId="stack" fill="#10b981" />
                    <Bar dataKey="instants" name="Instantáneos" stackId="stack" fill="#3b82f6" />
                    <Bar dataKey="sorceries" name="Conjuros" stackId="stack" fill="#f59e0b" />
                    <Bar dataKey="artifacts" name="Artefactos" stackId="stack" fill="#6366f1" />
                    <Bar dataKey="enchantments" name="Encantamientos" stackId="stack" fill="#ec4899" />
                    <Bar dataKey="planeswalkers" name="Planeswalkers" stackId="stack" fill="#8b5cf6" />
                    {!excludeLands && <Bar dataKey="lands" name="Tierras" stackId="stack" fill="#84cc16" />}
                    <Bar dataKey="other" name="Otros" stackId="stack" fill="#71717a" />
                  </>
                ) : (
                  <>
                    <Bar dataKey="white" name="Blanco" stackId="stack" fill="#fef08a" />
                    <Bar dataKey="blue" name="Azul" stackId="stack" fill="#38bdf8" />
                    <Bar dataKey="black" name="Negro" stackId="stack" fill="#a855f7" />
                    <Bar dataKey="red" name="Rojo" stackId="stack" fill="#f87171" />
                    <Bar dataKey="green" name="Verde" stackId="stack" fill="#4ade80" />
                    <Bar dataKey="multi" name="Multicolor" stackId="stack" fill="#eab308" />
                    <Bar dataKey="colorless" name="Incoloro" stackId="stack" fill="#94a3b8" />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Composición por Tipo de Carta */}
        <div className="xl:col-span-5 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="border-b border-border/60 pb-3">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Composición por Tipo de Carta
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conteo y proporción porcentual en el mazo principal.
            </p>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center pt-1">
            {typeDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic">
                No hay cartas para analizar en el mazo principal.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                <PieChart margin={{ top: 15, right: 35, bottom: 15, left: 35 }}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${item?.payload?.count || 0} cartas (${item?.payload?.percentage || 0}%)`,
                      name,
                    ]}
                  />
                  <Pie
                    data={typeDistribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={0}
                    label={(props: any) => (
                      <text
                        x={props.x}
                        y={props.y}
                        fill={props.payload?.color || "#ffffff"}
                        textAnchor={props.textAnchor}
                        dominantBaseline="central"
                        style={{ fontSize: "11px", fontWeight: 600 }}
                      >
                        {`${props.payload?.label || ""} (${props.payload?.count ?? 0})`}
                      </text>
                    )}
                    labelLine={{ stroke: "#71717a", strokeWidth: 1 }}
                    isAnimationActive={false}
                  >
                    {typeDistribution.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 2 — Base de maná (Regla Commander + Taplands + Color Pie)         */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            Base de Maná y Color Pie Comparativo
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Compara el recuento de tierras contra la regla de Commander, analiza el impacto de tierras giradas y detecta desfases de color.
          </p>
        </div>

        {/* Mana Base & Taplands Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-secondary/30 p-5 rounded-2xl border border-border">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tierras Actuales
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-foreground">
                {manaBase.totalLands}
              </span>
              <span className="text-xs text-muted-foreground">tierras en mazo</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Regla Commander
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-primary">
                ~{manaBase.recommendedLands}
              </span>
              <span className="text-xs text-muted-foreground">tierras sugeridas</span>
            </div>
          </div>

          {/* Taplands & Tempo Drag Card */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tierras Giradas (Taplands)
              </span>
              <span className="text-xs font-mono font-bold text-foreground">
                {manaBase.taplands.count} ({manaBase.taplands.percentage}%)
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono ${
                manaBase.taplands.percentage > 30
                  ? "text-rose-400"
                  : manaBase.taplands.percentage > 15
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}>
                +{manaBase.taplands.tempoDrag}
              </span>
              <span className="text-xs text-muted-foreground">turnos retraso tempo</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {manaBase.taplands.openingHandProb}% prob. en mano de 7
            </p>
          </div>

          <div className="flex flex-col justify-center">
            {manaBase.totalLands < manaBase.recommendedLands - 2 ? (
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-950/30 p-2.5 rounded-lg border border-rose-800/40">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Base ajustada: podrías sufrir falta de tierras en turnos 3–5.</span>
              </div>
            ) : manaBase.totalLands > manaBase.recommendedLands + 3 ? (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/40">
                <Info className="h-4 w-4 shrink-0" />
                <span>Base generosa: reduce tierras si llevas mucha aceleración barata.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-800/40">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Base equilibrada según la curva media de {curveData.avgCmcWithoutLands} CMC.</span>
              </div>
            )}
          </div>
        </div>

        {/* Color Pie Comparison: Pips vs Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span>Equilibrio Color Pie: Símbolos en Costes vs Fuentes en Tierras/Roca</span>
            </h4>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Compara el % de demanda frente a la oferta de maná
            </span>
          </div>

          {manaBase.colorComparison.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No se detectaron símbolos coloreados en el mazo.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {manaBase.colorComparison.map((item) => {
                const isUnderSupplied = item.imbalance >= 8;
                const isOverSupplied = item.imbalance <= -8;

                return (
                  <div
                    key={item.color}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isUnderSupplied
                        ? "bg-rose-950/15 border-rose-800/40"
                        : isOverSupplied
                        ? "bg-blue-950/15 border-blue-800/40"
                        : "bg-background/60 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.fillColor }}
                        />
                        <span className="font-bold text-sm text-foreground">
                          {item.name} ({item.color})
                        </span>
                      </div>
                      {isUnderSupplied ? (
                        <Badge variant="outline" className="bg-rose-950/40 text-rose-400 border-rose-800/50 text-[10px]">
                          Déficit relativo ({item.imbalance > 0 ? `+${item.imbalance}%` : `${item.imbalance}%`})
                        </Badge>
                      ) : isOverSupplied ? (
                        <Badge variant="outline" className="bg-blue-950/40 text-blue-400 border-blue-800/50 text-[10px]">
                          Superávit relativo ({item.imbalance}%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border-emerald-800/50 text-[10px]">
                          Equilibrado
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      {/* Pips row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
                          <span>Costes (Demanda):</span>
                          <span className="font-semibold text-foreground">
                            {item.pips} pips ({item.pipPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${item.pipPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Sources row */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
                          <span>Fuentes (Oferta):</span>
                          <span className="font-semibold text-foreground">
                            {item.sources} fuentes ({item.sourcePercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${item.sourcePercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Frank Karsten Minimum Color Sources Breakdown */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <h4 className="text-base font-bold text-foreground">
              Fuentes Mínimas de Frank Karsten (90% Probabilidad en Turno)
            </h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Recomendaciones estadísticas para asegurar que puedes jugar tus cartas con los costes de color más exigentes sin quedarte sin maná coloreado.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {manaBase.karstenRecs.map((rec) => {
              const isOptimal = rec.status === "optimal";
              const isWarning = rec.status === "warning";

              return (
                <div
                  key={rec.color}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isOptimal
                      ? "bg-emerald-950/15 border-emerald-800/40"
                      : isWarning
                      ? "bg-amber-950/15 border-amber-800/40"
                      : "bg-rose-950/15 border-rose-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">
                      {rec.colorName} ({rec.color})
                    </span>
                    {isOptimal ? (
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Óptimo</span>
                      </div>
                    ) : isWarning ? (
                      <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Ajustado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Insuficiente</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Fuentes disponibles:</span>
                      <span className="font-bold text-foreground">
                        {rec.sourcesOwned} / {rec.sourcesRecommended} rec.
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (rec.sourcesOwned / Math.max(1, rec.sourcesRecommended)) * 100
                          )}%`,
                        }}
                        className={`h-full ${
                          isOptimal
                            ? "bg-emerald-400"
                            : isWarning
                            ? "bg-amber-400"
                            : "bg-rose-400"
                        }`}
                      />
                    </div>
                  </div>

                  {rec.toughestCost && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Mayor coste:</span>
                      <ManaCost manaCost={rec.toughestCost} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILA 4 — Calculadoras interactivas (Mano de 7 + Commander + Slider + Libre)*/}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-8">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            Probabilidades de Apertura y Simulador Interactivo
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Visualiza tus probabilidades de tierras en mano inicial de 7 cartas y prueba en directo el impacto de ajustar la cantidad de tierras.
          </p>
        </div>

        {/* 1. Pre-calculated fast table: 7 cards opening hand */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
            Mano Inicial de 7 Cartas ({currentLands} Tierras en Mazo de {totalDeckCards})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">0–1 Tierras (Screw)</span>
              <p className="text-2xl font-bold font-mono text-rose-400">
                {currentHandProbs.lands0or1}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Exactamente 2</span>
              <p className="text-2xl font-bold font-mono text-amber-400">
                {currentHandProbs.lands2}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/10 space-y-1">
              <span className="text-[11px] text-primary font-semibold">Exactamente 3 (Ideal)</span>
              <p className="text-2xl font-bold font-mono text-primary">
                {currentHandProbs.lands3}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Exactamente 4</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {currentHandProbs.lands4}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-background space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">5+ Tierras (Flood)</span>
              <p className="text-2xl font-bold font-mono text-indigo-400">
                {currentHandProbs.lands5plus}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-800/40 bg-emerald-950/20 space-y-1">
              <span className="text-[11px] text-emerald-300 font-semibold">2–4 Tierras (Óptima)</span>
              <p className="text-2xl font-bold font-mono text-emerald-400">
                {currentHandProbs.lands2to4}%
              </p>
            </div>
          </div>
        </div>

        {/* 2. Commander on Curve & Interactive Land Slider */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-secondary/30 p-6 rounded-2xl border border-border">
          {/* Commander on Curve */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-bold text-foreground">
                Comandante en Curva ({commanderCard?.cardName || "Comandante"})
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Probabilidad de disponer de al menos {commanderOnCurve.turn} manás/tierras en el Turno {commanderOnCurve.turn} (habiendo robado {commanderOnCurve.cardsSeen} cartas).
            </p>
            <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-border">
              <div className="text-3xl font-extrabold font-mono text-amber-400">
                {commanderOnCurve.probability}%
              </div>
              <div className="text-xs text-muted-foreground">
                probabilidad de castear en turno {commanderOnCurve.turn} con {simulatedLands} tierras en mazo.
              </div>
            </div>
          </div>

          {/* Interactive Land Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">
                  Simulador de Tierras Dinámico
                </h4>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-primary/15 text-primary border-primary/30">
                {simulatedLands} Tierras
              </Badge>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="28"
                max="45"
                value={simulatedLands}
                onChange={(e) => setSimulatedLands(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer h-2 bg-secondary rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>28 Tierras</span>
                <span>36 Baseline</span>
                <span>45 Tierras</span>
              </div>
            </div>

            {/* Comparison readout */}
            <div className="bg-background p-3.5 rounded-xl border border-border text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Probabilidad de 3 tierras:</span>
                <span className="font-mono font-bold text-foreground">
                  {currentHandProbs.lands3}% → <span className="text-primary">{simulatedHandProbs.lands3}%</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mano jugable (2–4 tierras):</span>
                <span className="font-mono font-bold text-foreground">
                  {currentHandProbs.lands2to4}% → <span className="text-emerald-400">{simulatedHandProbs.lands2to4}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Custom Freeform Hypergeometric Calculator */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-foreground">
              Calculadora Hipergeométrica Personalizada
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Simula cualquier objetivo (aceleradores, piezas de combo, tutores, removal) introduciendo los valores manualmente.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-background/60 p-4 rounded-xl border border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Tamaño del mazo (N):
              </label>
              <Input
                type="number"
                min="1"
                value={popN}
                onChange={(e) => setPopN(parseInt(e.target.value) || 1)}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Ej. 99 en Commander</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Copias en mazo (K):
              </label>
              <Input
                type="number"
                min="0"
                value={successK}
                onChange={(e) => setSuccessK(parseInt(e.target.value) || 0)}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Ej. {currentLands} tierras</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Cartas robadas (n):
              </label>
              <Input
                type="number"
                min="1"
                value={sampleN}
                onChange={(e) => setSampleN(parseInt(e.target.value) || 1)}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Ej. 7 mano inicial</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Deseadas (k):
              </label>
              <Input
                type="number"
                min="0"
                value={desiredK}
                onChange={(e) => setDesiredK(parseInt(e.target.value) || 0)}
                className="font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground">Ej. 3 deseadas</p>
            </div>
          </div>

          {/* Results Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-background space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">
                Exactamente {desiredK} copias P(X = {desiredK})
              </p>
              <p className="text-2xl font-extrabold font-mono text-foreground tracking-tight">
                {customHyperResult.exact}%
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-emerald-950/20 border-emerald-800/40 space-y-1">
              <p className="text-xs text-emerald-300 font-semibold">
                Al menos {desiredK} copias P(X ≥ {desiredK})
              </p>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {customHyperResult.atLeast}%
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-background space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">
                Como máximo {desiredK} copias P(X ≤ {desiredK})
              </p>
              <p className="text-2xl font-extrabold font-mono text-foreground tracking-tight">
                {customHyperResult.atMost}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
