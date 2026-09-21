"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmail, signUpWithEmail, signInAsGuest } from "@/actions/auth";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationNotice(false);
    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signInWithEmail(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          router.push("/decks");
          router.refresh();
        }
      } else {
        const result = await signUpWithEmail(email, password);
        if (result.error) {
          setError(result.error);
        } else if (result.needsConfirmation) {
          setConfirmationNotice(true);
        } else {
          router.push("/decks");
          router.refresh();
        }
      }
    } catch (err) {
      setError("Ocurrió un error inesperado. Por favor, intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      const result = await signInAsGuest();
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/decks");
        router.refresh();
      }
    } catch (err) {
      setError("Ocurrió un error inesperado al acceder como invitado.");
      console.error(err);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-[400px] hover:border-border">
      <CardHeader className="text-center pb-2 pt-8 px-8">
        <div className="mx-auto mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold tracking-tight">
          M
        </div>
        <CardTitle className="text-2xl font-medium tracking-tight">
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </CardTitle>
        <CardDescription className="text-sm mt-2">
          {mode === "login"
            ? "Sincroniza mazos y colección en un solo lugar."
            : "Guarda tu inventario y calcula qué te falta."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 px-8 pb-8 pt-4">
        <div className="flex rounded-full bg-secondary p-1 border border-border">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setConfirmationNotice(false);
            }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === "login"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
              setConfirmationNotice(false);
            }}
            className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-colors ${
              mode === "register"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Registrarse
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {confirmationNotice && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/25 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Cuenta creada. Revisa tu correo para confirmar.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Email</label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Contraseña</label>
            <Input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-10 mt-1">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              "Continuar"
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground">o</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={loading || guestLoading}
          onClick={handleGuestSignIn}
          className="w-full h-10"
        >
          {guestLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Continuar como invitado"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
