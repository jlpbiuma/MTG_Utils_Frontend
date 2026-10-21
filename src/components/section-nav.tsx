"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Library, ShoppingCart } from "lucide-react";
const sections = [
  { href: "/decks", label: "Mazos", icon: Layers },
  { href: "/collection/inventory", label: "Colección", icon: Library },
  { href: "/buy/needs", label: "Comprar", icon: ShoppingCart },
];
export function SectionNav({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label={mobile ? "Navegación móvil" : "Navegación principal"}
      className={
        mobile
          ? "fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          : "hidden md:flex gap-1"
      }
    >
      {sections.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(`/${href.split("/")[1]}`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-md px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring ${active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"} ${mobile ? "flex-col gap-1 py-2 text-xs" : ""}`}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
export function BuyTabNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Secciones de compra"
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"
    >
      {[
        ["needs", "Necesito"],
        ["list", "Lista de compra"],
        ["offers", "Evaluar oferta"],
        ["expenses", "Gastos e inversión"],
        ["budget", "Golden Wants"],
      ].map(([slug, label]) => (
        <Link
          key={slug}
          href={`/buy/${slug}`}
          aria-current={path === `/buy/${slug}` ? "page" : undefined}
          className={`min-h-11 shrink-0 rounded-md px-3 py-3 text-sm ${path === `/buy/${slug}` ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
