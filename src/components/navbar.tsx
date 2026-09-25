import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { getCurrentUser, signOutUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/decks", label: "Mazos" },
  { href: "/collection", label: "Colección" },
  { href: "/priorities", label: "Prioridades" },
  { href: "/wants", label: "Wants" },
  { href: "/matches", label: "Oportunidades" },
  { href: "/prices", label: "Precios" },
  { href: "/account", label: "Cuenta" },
] as const;

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/decks"
            className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-semibold tracking-tight">
              M
            </span>
            <span className="font-medium text-sm tracking-tight">MTG Utils</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user.isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#333] transition-colors"
                title="Ver detalles de mi cuenta"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    user.mode === "demo" ? "bg-muted-foreground" : "bg-success"
                  }`}
                />
                <span className="font-mono max-w-[140px] truncate">{user.email}</span>
              </Link>

              <form action={signOutUser}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1.5"
                  title="Cerrar sesión"
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
