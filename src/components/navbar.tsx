import { SectionNav } from "@/components/section-nav";
import { GlobalSearch } from "@/components/global-search";
import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { getCurrentUser, signOutUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/decks"
            className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-semibold tracking-tight">
              M
            </span>
            <span className="hidden lg:inline font-medium text-sm tracking-tight">MTG Utils</span>
          </Link>

          <SectionNav />
        </div>

        <div className="flex items-center gap-2">
          <GlobalSearch />
          {user.isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#333] transition-colors"
                aria-label="Mi cuenta" title="Ver detalles de mi cuenta"
              >
                <UserRound aria-hidden className="h-4 w-4 lg:hidden" />
                <span
                  className={`hidden lg:block h-1.5 w-1.5 rounded-full ${
                    user.mode === "demo" ? "bg-muted-foreground" : "bg-success"
                  }`}
                />
                <span className="hidden lg:inline font-mono max-w-[140px] truncate">{user.email}</span>
              </Link>

              <form action={signOutUser}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 min-w-11 px-2.5 text-xs gap-1.5"
                  aria-label="Cerrar sesión" title="Cerrar sesión"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm" className="gap-1.5 h-8">
              <Link href="/login">
                <LogIn className="h-3.5 w-3.5" />
                Iniciar sesión
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
