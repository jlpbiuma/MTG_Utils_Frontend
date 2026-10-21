"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
const steps = [
  { text: "Crear o importar un mazo", href: "/decks" },
  { text: "Importar tus cartas a la colección", href: "/collection/inventory" },
  { text: "Revisar Necesito y preparar una compra", href: "/buy/needs" },
];
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mtg-onboarding", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mtg-onboarding", callback);
  };
}
export function OnboardingChecklist({
  userId,
  hasDecks,
}: {
  userId: string;
  hasDecks: boolean;
}) {
  const key = `mtg-onboarding:${userId}`;
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  const completed = steps.map(
    (_, index) => saved[index] === "1" || (index === 0 && hasDecks),
  );
  function toggle(index: number, checked: boolean) {
    const next = completed
      .map((value, i) => ((i === index ? checked : value) ? "1" : "0"))
      .join("");
    try {
      localStorage.setItem(key, next);
    } catch {
      return;
    }
    window.dispatchEvent(new Event("mtg-onboarding"));
  }
  return (
    <details
      className="mt-4 rounded-xl border border-border bg-card p-4"
      open={!hasDecks}
    >
      <summary className="cursor-pointer font-medium">
        Guía para empezar o retomar · {completed.filter(Boolean).length}/3
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Marca los pasos completados. Se guardan para tu cuenta en este
        navegador.
      </p>
      <ol className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.href} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={step.text}
              checked={completed[index]}
              disabled={index === 0 && hasDecks}
              onChange={(event) => toggle(index, event.target.checked)}
              className="h-5 w-5 accent-amber-500"
            />
            <Link className="underline" href={step.href}>
              {step.text}
            </Link>
          </li>
        ))}
      </ol>
    </details>
  );
}
