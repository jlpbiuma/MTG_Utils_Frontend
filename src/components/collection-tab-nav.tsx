"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/collection/inventory", label: "Inventario", icon: Library },
  { href: "/collection/expansions", label: "Rendimiento por expansión", icon: TrendingUp },
] as const;

export function CollectionTabNav() {
  const pathname = usePathname();
  return (
    <div
      role="navigation"
      aria-label="Secciones de colección"
      className="flex min-h-11 items-center justify-center rounded-md bg-secondary/70 p-1 border border-border text-muted-foreground gap-1 flex-wrap sm:flex-nowrap"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
