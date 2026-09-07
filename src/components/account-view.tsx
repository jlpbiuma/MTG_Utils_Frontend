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
    user.email === "demo@magic.io" ||
    user.email === "planeswalker@magic.io" ||
    user.id === "00000000-0000-0000-0000-000000000001" ||
    user.id === "00000000-0000-0000-0000-000000000000";

  const sessionLabel = isDemo ? "Invitado / demo" : "Cuenta autenticada";
  const initialLetter = (user.name || user.email || "J").charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOutUser();
  };

  if (!user.isAuthenticated && !isDemo) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <div className="h-20 w-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6 shadow-xl shadow-amber-500/5">
          <User className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-white">No has iniciado sesión</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-md mx-auto">
          Inicia sesión o accede como invitado para gestionar tus mazos, tu colección física y la completitud sincronizada con el backend.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild variant="mana" className="h-11 px-6 font-bold shadow-lg shadow-amber-500/20">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
      {/* Header Profile Section */}
      <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-5">
          {/* Avatar circle matching Swift AccountView */}
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/30 via-amber-600/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-300 font-extrabold text-2xl shadow-lg shadow-amber-500/10">
            {initialLetter}
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              {user.name || "Jugador"}
              {isDemo ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300">
                  Demo
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                  Activo
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{sessionLabel}</p>
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
      <Card className="border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-slate-800/60">
          <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            Datos de la Sesión
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Información técnica de tu conexión sincronizada con el backend de MTG Utils.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-slate-800/60 pt-2 text-sm">
          <div className="py-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Server className="h-3.5 w-3.5 text-sky-400" />
              Origen
            </span>
            <span className="font-mono text-slate-200 text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              Backend (localhost:8000)
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Sesión
            </span>
            <span className="font-semibold text-slate-200 text-xs">
              {sessionLabel}
            </span>
          </div>

          {user.email && (
            <div className="py-3.5 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
                <Mail className="h-3.5 w-3.5 text-amber-400" />
                Correo
              </span>
              <span className="font-mono text-slate-200 text-xs truncate max-w-[240px]">
                {user.email}
              </span>
            </div>
          )}

          <div className="py-3.5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2 text-xs uppercase font-medium tracking-wider">
              <Fingerprint className="h-3.5 w-3.5 text-purple-400" />
              ID de usuario
            </span>
            <span className="font-mono text-slate-400 text-xs truncate max-w-[220px] bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/60" title={user.id}>
              {user.id}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sync Note Banner */}
      <div className="p-4 rounded-xl border border-sky-900/40 bg-sky-950/20 text-xs text-sky-200/90 flex items-start gap-3">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <p>
          Mazos, colección y completitud se sincronizan con el backend a través de tu sesión autenticada. Cualquier cambio en tus listas o inventario queda persistido de forma centralizada.
        </p>
      </div>

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/decks"
          className="group p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-amber-500/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm group-hover:text-amber-300 transition-colors">Mis Mazos</p>
              <p className="text-xs text-slate-400">Ver y gestionar tus mazos</p>
            </div>
          </div>
          <span className="text-slate-500 group-hover:text-amber-300 font-mono text-xs">→</span>
        </Link>

        <Link
          href="/collection"
          className="group p-4 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-sky-500/40 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm group-hover:text-sky-300 transition-colors">Mi Colección</p>
              <p className="text-xs text-slate-400">Ver inventario físico</p>
            </div>
          </div>
          <span className="text-slate-500 group-hover:text-sky-300 font-mono text-xs">→</span>
        </Link>
      </div>

      {/* Confirmation Dialog for Sign Out matching Swift .confirmationDialog("¿Cerrar sesión?") */}
      {showSignOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">¿Cerrar sesión?</h3>
                <p className="text-xs text-slate-400">Volverás a la pantalla de inicio de sesión.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignOutDialog(false)}
                disabled={isSigningOut}
                className="text-xs text-slate-300 hover:text-white"
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
