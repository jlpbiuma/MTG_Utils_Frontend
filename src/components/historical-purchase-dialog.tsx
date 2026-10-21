"use client";
import { useEffect, useState } from "react";
import {
  validatePurchaseList,
  prepareHistoricalPurchase,
  commitPurchase,
} from "@/actions/acquisitions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AcquisitionReview } from "@/components/acquisition-review";
import { Progress } from "@/components/ui/progress";
import { kindLabels, originLabels, todayDate } from "@/lib/acquisitions";
import type {
  AcquisitionQuote,
  HistoricalSelection,
  PurchaseListValidation,
  PurchaseKind,
  PurchaseOrigin,
} from "@/lib/acquisitions";

function initialSelections(
  validation: PurchaseListValidation,
): HistoricalSelection[] {
  const remaining = new Map<string, number>();
  const selections: HistoricalSelection[] = [];
  for (const line of validation.lines) {
    let needed = line.quantity;
    for (const candidate of line.candidates) {
      if (!candidate.printingId) continue;
      const available =
        remaining.get(candidate.collectionCardId) ??
        candidate.availableQuantity;
      const quantity = Math.min(available, needed);
      if (quantity > 0)
        selections.push({
          line: line.line,
          collectionCardId: candidate.collectionCardId,
          quantity,
        });
      remaining.set(candidate.collectionCardId, available - quantity);
      needed -= quantity;
    }
  }
  return selections;
}

export function HistoricalPurchaseDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [rawText, setRawText] = useState("");
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<PurchaseKind>("precon");
  const [origin, setOrigin] = useState<PurchaseOrigin>("other");
  const [seller, setSeller] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [validation, setValidation] = useState<PurchaseListValidation | null>(
    null,
  );
  const [selections, setSelections] = useState<HistoricalSelection[]>([]);
  const [validating, setValidating] = useState(false);
  const [validationFailed, setValidationFailed] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<AcquisitionQuote | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      if (!rawText.trim()) {
        if (current) setValidating(false);
        return;
      }
      try {
        const result = await validatePurchaseList(rawText);
        if (!current) return;
        if (result.ok) {
          setValidation(result.data);
          setSelections(initialSelections(result.data));
          setError("");
          setValidationFailed(false);
        } else {
          setError(result.error);
          setValidationFailed(true);
        }
      } catch {
        if (current) {
          setError("No se pudo validar el listado. Inténtalo de nuevo.");
          setValidationFailed(true);
        }
      } finally {
        if (current) setValidating(false);
      }
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [rawText, retryVersion]);

  function changeText(text: string) {
    setRawText(text);
    setValidation(null);
    setSelections([]);
    setQuote(null);
    setAcknowledge(false);
    setValidating(!!text.trim());
    setError("");
    setValidationFailed(false);
  }
  function invalidate() {
    setQuote(null);
    setAcknowledge(false);
    setError("");
  }
  function replaceName(line: number, quantity: number, suggestion: string) {
    const lines = rawText.split("\n");
    lines[line - 1] = `${quantity} ${suggestion}`;
    changeText(lines.join("\n"));
  }
  function selectCopies(
    line: number,
    collectionCardId: string,
    quantity: number,
  ) {
    invalidate();
    setSelections((previous) => [
      ...previous.filter(
        (item) =>
          item.line !== line || item.collectionCardId !== collectionCardId,
      ),
      ...(quantity > 0 ? [{ line, collectionCardId, quantity }] : []),
    ]);
  }
  const quantitiesMatch = validation?.lines.every(
    (line) =>
      selections
        .filter((item) => item.line === line.line)
        .reduce((sum, item) => sum + item.quantity, 0) === line.quantity,
  );
  const validCopies = selections.every(
    (item) =>
      Number.isInteger(item.quantity) &&
      item.quantity > 0 &&
      selections
        .filter((other) => other.collectionCardId === item.collectionCardId)
        .reduce((sum, other) => sum + other.quantity, 0) <=
        (validation?.lines
          .flatMap((line) => line.candidates)
          .find((c) => c.collectionCardId === item.collectionCardId)
          ?.availableQuantity ?? 0),
  );
  const valid =
    validCopies &&
    !!validation?.valid &&
    quantitiesMatch &&
    !!name.trim() &&
    total.trim() !== "" &&
    Number.isFinite(Number(total)) &&
    Number(total) >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date <= todayDate() &&
    !validating;
  const problems =
    validation?.lines.flatMap((line) => {
      if (line.error)
        return [{ line: line.line, name: line.name, error: line.error }];
      const chosen = selections.filter((item) => item.line === line.line);
      const quantity = chosen.reduce((sum, item) => sum + item.quantity, 0);
      if (
        quantity !== line.quantity ||
        chosen.some((item) => !Number.isInteger(item.quantity))
      ) {
        const unresolved = line.candidates.every(
          (candidate) => !candidate.printingId,
        );
        return [
          {
            line: line.line,
            name: line.name,
            error: unresolved
              ? "Falta resolver la impresión en tu colección."
              : `Selecciona ${line.quantity} copias; hay ${quantity} seleccionadas.`,
          },
        ];
      }
      if (
        chosen.some(
          (item) =>
            selections
              .filter(
                (other) => other.collectionCardId === item.collectionCardId,
              )
              .reduce((sum, other) => sum + other.quantity, 0) >
            (line.candidates.find(
              (candidate) =>
                candidate.collectionCardId === item.collectionCardId,
            )?.availableQuantity ?? 0),
        )
      )
        return [
          {
            line: line.line,
            name: line.name,
            error:
              "La selección supera las copias disponibles sin asociar a otra compra.",
          },
        ];
      return [];
    }) ?? [];
  const ready = (validation?.lines.length ?? 0) - problems.length;

  async function review() {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await prepareHistoricalPurchase({
        rawText,
        name: name.trim(),
        total,
        acquiredOn: date,
        kind,
        origin,
        seller: seller.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        selections,
      });
      if (result.ok) {
        setQuote(result.data);
        setAcknowledge(false);
      } else setError(result.error);
    } catch {
      setError("No se pudo preparar la compra. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!quote || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await commitPurchase(quote.quoteId, acknowledge);
      if (!result.ok) {
        setError(result.error);
        if (result.budget) {
          setQuote({ ...quote, budget: result.budget });
          setAcknowledge(false);
        }
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setError("No se pudo registrar la compra. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "min-h-11 w-full rounded-md border border-input bg-background px-3";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Registrar compra antigua</DialogTitle>
          <DialogDescription>
            Vincula cartas que ya están en tu colección a su compra original. No
            se añadirán nuevas copias.
          </DialogDescription>
        </DialogHeader>
        {busy && (
          <div className="space-y-2" aria-busy="true">
            <Progress
              aria-label={quote ? "Registrando compra" : "Preparando compra"}
              value={null}
            />
            <p role="status" className="text-sm">
              {quote ? "Registrando compra…" : "Preparando compra…"}
            </p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Nombre del lote o producto
            <input
              aria-label="Nombre del lote o producto"
              required
              value={name}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setName(event.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm">
            Tipo de producto
            <select
              aria-label="Tipo de producto"
              value={kind}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setKind(event.target.value as PurchaseKind);
              }}
              className={inputClass}
            >
              {Object.entries(kindLabels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Precio total pagado (€)
            <input
              aria-label="Precio total pagado (€)"
              required
              type="number"
              min="0"
              step="0.01"
              value={total}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setTotal(event.target.value);
              }}
              className={inputClass}
            />
            <span className="block text-xs text-muted-foreground">
              Importe final de la compra, incluido cualquier envío o comisión
              antigua.
            </span>
          </label>
          <label className="space-y-1 text-sm">
            Fecha de adquisición
            <input
              aria-label="Fecha de adquisición"
              required
              type="date"
              max={todayDate()}
              value={date}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setDate(event.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm">
            Origen
            <select
              aria-label="Origen"
              value={origin}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setOrigin(event.target.value as PurchaseOrigin);
              }}
              className={inputClass}
            >
              {Object.entries(originLabels).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Vendedor o procedencia
            <input
              aria-label="Vendedor o procedencia"
              value={seller}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setSeller(event.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Referencia o enlace de compra
            <input
              aria-label="Referencia o enlace de compra"
              value={sourceUrl}
              disabled={busy}
              onChange={(event) => {
                invalidate();
                setSourceUrl(event.target.value);
              }}
              className={inputClass}
            />
          </label>
        </div>
        <label className="space-y-1 text-sm">
          Listado de cartas
          <textarea
            aria-label="Listado de cartas"
            required
            rows={6}
            value={rawText}
            disabled={busy}
            onChange={(event) => changeText(event.target.value)}
            placeholder={"1 Sol Ring\n3 Island"}
            className="w-full rounded-md border border-input bg-background p-3 font-mono"
          />
          <span className="block text-xs text-muted-foreground">
            Una carta por línea, con su cantidad. Nombres en español o inglés;
            hasta 500 líneas.
          </span>
        </label>
        {!!rawText.trim() && (
          <div className="space-y-2" aria-busy={validating}>
            <Progress
              aria-label="Validación de cartas"
              value={
                validating
                  ? null
                  : validation?.lines.length
                    ? (ready / validation.lines.length) * 100
                    : 0
              }
              aria-valuetext={
                validating
                  ? "Validando nombres, impresiones y copias"
                  : `${ready} de ${validation?.lines.length ?? 0} líneas listas para registrar`
              }
            />
            <p role="status" className="text-sm">
              {validating
                ? "Validando nombres, impresiones y copias…"
                : validation
                  ? `${validation.lines.length} líneas comprobadas · ${validation.lines.reduce((sum, line) => sum + line.quantity, 0)} copias · ${ready} listas · ${problems.length} con problemas`
                  : validationFailed
                    ? "Validación interrumpida. No se han comprobado las cartas."
                    : "Esperando validación."}
            </p>
            {validationFailed && (
              <Button
                variant="outline"
                disabled={validating}
                onClick={() => {
                  setValidating(true);
                  setValidationFailed(false);
                  setError("");
                  setRetryVersion((version) => version + 1);
                }}
              >
                Reintentar validación
              </Button>
            )}
          </div>
        )}
        {problems.length > 0 && (
          <section
            aria-label="Cartas que requieren atención"
            className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
          >
            <h3 className="font-semibold">Cartas que requieren atención</h3>
            <ul className="space-y-2">
              {problems.map((problem) => (
                <li key={problem.line}>
                  <Button
                    variant="link"
                    className="h-auto min-h-11 whitespace-normal px-0 text-left"
                    aria-label={`Ir a línea ${problem.line}: ${problem.name}`}
                    onClick={() => {
                      const element = document.getElementById(
                        `historical-line-${problem.line}`,
                      );
                      element?.focus();
                      element?.scrollIntoView?.({ block: "nearest" });
                    }}
                  >
                    Línea {problem.line}: {problem.name}
                  </Button>
                  <p>{problem.error}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {validation && (
          <ol aria-label="Validación del listado" className="space-y-3">
            {validation.lines.map((line) => (
              <li
                key={line.line}
                id={`historical-line-${line.line}`}
                tabIndex={-1}
                className="space-y-2 rounded-lg border border-border p-3 text-sm"
              >
                <p className="font-medium">
                  Línea {line.line}: {line.quantity} × {line.name}
                </p>
                {line.error ? (
                  <p role="alert" className="text-destructive">
                    {line.error}
                  </p>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-400">
                    Nombre reconocido
                  </p>
                )}
                {line.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      replaceName(line.line, line.quantity, suggestion)
                    }
                  >
                    Usar {suggestion}
                  </Button>
                ))}
                {line.candidates.map((candidate) => (
                  <label
                    key={candidate.collectionCardId}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      {candidate.cardName} · {candidate.setCode?.toUpperCase()}{" "}
                      #{candidate.collectorNumber} ·{" "}
                      {candidate.isFoil ? "Foil" : "Normal"} ·{" "}
                      {candidate.availableQuantity} disponibles
                    </span>
                    <input
                      aria-label={`Copias de ${candidate.cardName} ${candidate.setCode} ${candidate.isFoil ? "foil" : "normal"} en línea ${line.line}`}
                      type="number"
                      min="0"
                      max={candidate.availableQuantity}
                      step="1"
                      value={
                        selections.find(
                          (item) =>
                            item.line === line.line &&
                            item.collectionCardId ===
                              candidate.collectionCardId,
                        )?.quantity ?? 0
                      }
                      disabled={busy || !candidate.printingId}
                      onChange={(event) =>
                        selectCopies(
                          line.line,
                          candidate.collectionCardId,
                          Math.max(0, Number(event.target.value)),
                        )
                      }
                      className="min-h-11 w-24 rounded-md border border-input bg-background px-3"
                    />
                  </label>
                ))}
              </li>
            ))}
          </ol>
        )}
        {validation?.valid && !quantitiesMatch && (
          <p role="alert" className="text-destructive">
            Selecciona exactamente las copias indicadas en cada línea.
          </p>
        )}
        {quote && (
          <AcquisitionReview
            quote={quote}
            acknowledge={acknowledge}
            onAcknowledge={setAcknowledge}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          {quote ? (
            <Button
              disabled={
                busy || (!!quote.budget.requiresAcknowledgement && !acknowledge)
              }
              onClick={confirm}
            >
              {busy ? "Registrando…" : "Registrar compra"}
            </Button>
          ) : (
            <Button disabled={!valid || busy} onClick={review}>
              {busy ? "Preparando…" : "Revisar compra"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
