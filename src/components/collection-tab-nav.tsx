"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/collection/inventory", label: "Inventario", shortLabel: "Inventario", icon: Library },
  { href: "/collection/expansions", label: "Rendimiento por expansión", shortLabel: "Expansiones", icon: TrendingUp },
] as const;

export function CollectionTabNav() {
  const pathname = usePathname();
  return (
    <div
      role="navigation"
      aria-label="Secciones de colección"
      // Segmented control: equal halves on phones (short labels), centered row from sm.
      className="grid min-h-11 grid-cols-2 items-center rounded-md bg-secondary/70 p-1 border border-border text-muted-foreground gap-1 sm:flex sm:justify-center"
    >
      {TABS.map(({ href, label, shortLabel, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
