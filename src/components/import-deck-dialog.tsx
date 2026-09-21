"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
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
import { importDeckFromText, importDeckFromMoxfieldUrl } from "@/actions/import";

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

export function ImportDeckDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"text" | "moxfield">("text");

  // Form states
  const [deckName, setDeckName] = useState("");
  const [format, setFormat] = useState("Commander / EDH");
  const [deckText, setDeckText] = useState("");
  const [moxfieldUrl, setMoxfieldUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloudflareHelper, setShowCloudflareHelper] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use filename as default deck name if not yet filled
    if (!deckName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setDeckName(cleanName);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setDeckText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckText.trim()) {
      setError("Por favor pega o carga una lista de cartas.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await importDeckFromText({
        name: deckName.trim() || "Mazo Importado",
        format,
        rawText: deckText,
      });

      setOpen(false);
      resetForm();
      router.push(`/decks/${res.deckId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar el mazo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMoxfieldImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moxfieldUrl.trim()) {
      setError("Por favor ingresa la URL del mazo de Moxfield.");
      return;
    }

    setLoading(true);
    setError(null);
    setShowCloudflareHelper(false);

    try {
      const res = await importDeckFromMoxfieldUrl(moxfieldUrl);

      if (res.error === "CLOUDFLARE_BLOCKED") {
        setShowCloudflareHelper(true);
        setError(
          "Moxfield tiene protección antibots activa por Cloudflare en este momento. Sigue las instrucciones abajo para importarlo con 2 clics."
        );
      } else if (res.error) {
        setError(res.message || "Error al conectar con Moxfield.");
      } else if (res.deckId) {
        setOpen(false);
        resetForm();
        router.push(`/decks/${res.deckId}`);
      }
    } catch (err: unknown) {
      setError("No se pudo completar la importación desde Moxfield.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDeckName("");
    setDeckText("");
    setMoxfieldUrl("");
    setError(null);
    setShowCloudflareHelper(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-border hover:border-primary hover:bg-accent">
          <UploadCloud className="h-4 w-4 text-primary" />
          Importar Mazo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-xl">
            <UploadCloud className="h-5 w-5 text-primary" />
            Importar Mazo (TXT / Moxfield / Arena)
          </DialogTitle>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex rounded-md bg-secondary p-1 border border-border mt-2">
          <button
            type="button"
            onClick={() => {
              setTab("text");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === "text"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Pegar Texto o Subir Archivo .TXT
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("moxfield");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              tab === "moxfield"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Enlace de Moxfield
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 mt-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 mt-3">
          {tab === "text" ? (
            <form onSubmit={handleTextImport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nombre del Mazo
                  </label>
                  <Input
                    placeholder="ej: Mi Mazo de Moxfield"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
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
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lista de Cartas (Formato Moxfield, Arena o plano)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-border text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-3 w-3" />
                    Cargar .txt
                  </Button>
                  <input
                    type="file"
                    accept=".txt"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <textarea
                  placeholder={`Pega aquí tu lista. Soporta formato Moxfield, MTG Arena o plano:\n\n1 Atraxa, Praetors' Voice (2XM) 198\n1 Sol Ring (C21) 263\n4 Lightning Bolt\n\n// Sideboard\n1 Force of Will`}
                  value={deckText}
                  onChange={(e) => setDeckText(e.target.value)}
                  rows={9}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
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
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Resolviendo cartas en Scryfall...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 mr-1.5" />
                      Importar Mazo
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleMoxfieldImport} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enlace público de Moxfield
                </label>
                <Input
                  placeholder="https://www.moxfield.com/decks/k0kUqT2tKUqjZ549Xh0O0A"
                  value={moxfieldUrl}
                  onChange={(e) => setMoxfieldUrl(e.target.value)}
                  required
                />
              </div>

              {showCloudflareHelper && (
                <div className="p-4 rounded-lg bg-secondary border border-border text-foreground text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <HelpCircle className="h-4 w-4" />
                    Cómo importar desde Moxfield en 2 clics:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Abre tu mazo en <strong>Moxfield.com</strong>.</li>
                    <li>
                      En la barra de herramientas del mazo, pulsa en <strong>Export</strong> $\rightarrow$ <strong>Text</strong> (o <em>Copy</em>).
                    </li>
                    <li>
                      Vuelve a esta ventana, cambia a la pestaña <strong>&quot;Pegar Texto&quot;</strong> y pega la lista.
                    </li>
                  </ol>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs border-primary/50 text-primary hover:bg-accent"
                    onClick={() => {
                      setTab("text");
                      setError(null);
                    }}
                  >
                    Ir a Pegar Texto
                  </Button>
                </div>
              )}

              <DialogFooter className="pt-4">
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
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Consultando Moxfield...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-1.5" />
                      Conectar e Importar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
