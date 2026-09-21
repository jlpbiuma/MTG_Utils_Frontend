"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Server,
  Shield,
  Mail,
  Fingerprint,
  LogOut,
  Layers,
  Library,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutUser, UserSessionState } from "@/actions/auth";

interface AccountViewProps {
  user: UserSessionState;
}

export function AccountView({ user }: AccountViewProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isDemo =
    user.mode === "demo" ||
    (user.mode !== "authenticated" &&
      (user.email === "demo@magic.io" ||
        user.id === "00000000-0000-0000-0000-000000000000"));

  const sessionLabel = isDemo ? "Invitado / demo" : "Cuenta autenticada";
  const initialLetter = (user.name || user.email || "J").charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutUser();
  };

  if (!user.isAuthenticated && !isDemo) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <div className="h-20 w-20 mx-auto rounded-lg bg-muted border border-border flex items-center justify-center text-primary mb-6">
          <User className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">No has iniciado sesión</h1>
        <p className="mt-2 text-muted-foreground text-sm max-w-md mx-auto">
          Inicia sesión o accede como invitado para gestionar tus mazos, tu colección física y la completitud sincronizada con el backend.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild variant="mana" className="h-11 px-6 font-semibold">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      {/* Header Profile Section */}
      <div className="p-6 rounded-lg border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar circle matching Swift AccountView */}
          <div className="h-16 w-16 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary font-semibold text-2xl">
            {initialLetter}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2.5">
              {user.name || "Jugador"}
              {isDemo ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  Demo
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                  Activo
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{sessionLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowSignOutDialog(true)}
            className="w-full sm:w-auto border-rose-900/50 text-rose-300 hover:bg-rose-950/40 hover:border-rose-700 h-9 px-4 text-xs font-medium gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      {/* Account Data / Details Section matching Swift Section("Datos") */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Datos de la Sesión
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Información técnica de tu conexión sincronizada con el backend de MTG Utils.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-2 text-sm">
          <div className="py-3.5 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              Origen
            </span>
            <span className="font-mono text-foreground text-xs bg-background px-2.5 py-1 rounded-md border border-border">
              Backend (localhost:8000)
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Sesión
            </span>
            <span className="font-semibold text-foreground text-xs">
              {sessionLabel}
            </span>
          </div>

          {user.email && (
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Correo
              </span>
              <span className="font-mono text-foreground text-xs truncate max-w-[240px]">
                {user.email}
              </span>
            </div>
          )}

          <div className="py-3.5 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
              ID de usuario
            </span>
            <span className="font-mono text-muted-foreground text-xs truncate max-w-[220px] bg-background px-2 py-0.5 rounded-md border border-border" title={user.id}>
              {user.id}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sync Note Banner */}
      <div className="p-4 rounded-lg border border-border bg-secondary text-xs text-muted-foreground flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          Mazos, colección y completitud se sincronizan con el backend a través de tu sesión autenticada. Cualquier cambio en tus listas o inventario queda persistido de forma centralizada.
        </p>
      </div>

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/decks"
          className="group p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-border transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted border border-border flex items-center justify-center text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Mis Mazos</p>
              <p className="text-xs text-muted-foreground">Ver y gestionar tus mazos</p>
            </div>
          </div>
          <span className="text-muted-foreground group-hover:text-primary font-mono text-xs">→</span>
        </Link>

        <Link
          href="/collection"
          className="group p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-border transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted border border-border flex items-center justify-center text-primary">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">Mi Colección</p>
              <p className="text-xs text-muted-foreground">Ver inventario físico</p>
            </div>
          </div>
          <span className="text-muted-foreground group-hover:text-primary font-mono text-xs">→</span>
        </Link>
      </div>

      {/* Confirmation Dialog for Sign Out matching Swift .confirmationDialog("¿Cerrar sesión?") */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground">¿Cerrar sesión?</h3>
                <p className="text-xs text-muted-foreground">Volverás a la pantalla de inicio de sesión.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignOutDialog(false)}
                disabled={isSigningOut}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="text-xs font-semibold"
              >
                {isSigningOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
