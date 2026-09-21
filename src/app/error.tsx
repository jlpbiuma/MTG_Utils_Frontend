"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
      <div className="p-8 rounded-lg border border-border bg-card">
        <div className="h-14 w-14 mx-auto rounded-lg bg-destructive/10 border border-destructive/25 flex items-center justify-center text-red-400 mb-6">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Algo no ha salido como esperábamos
        </h1>

        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          No se han podido cargar los datos de la aplicación. Esto suele ocurrir si la base de datos está iniciando, faltan variables de entorno en el despliegue o la sesión ha expirado.
        </p>

        {error?.digest && (
          <div className="mt-4 inline-block px-3 py-1 rounded-md bg-secondary border border-border text-[11px] font-mono text-muted-foreground">
            ID de diagnóstico: <span className="text-primary">{error.digest}</span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>

          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <LogIn className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </Link>

          <Link href="/decks">
            <Button variant="ghost" className="gap-2">
              <Home className="h-4 w-4" />
              Mis Mazos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
