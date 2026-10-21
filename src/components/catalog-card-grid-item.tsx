"use client";
import type { ReactNode } from "react";
import { Eye, ImageIcon } from "lucide-react";
import { CardImage } from "@/components/card-image";
import { ManaCost } from "@/components/mana-cost";

export function CatalogCardGridItem({ name, imageUri, typeLine, manaCost, isFoil, badges, children, footer, onOpen }: {
  name: string; imageUri?: string | null; typeLine?: string | null; manaCost?: string | null;
  isFoil?: boolean; badges: ReactNode; children?: ReactNode; footer?: ReactNode; onOpen: () => void;
}) {
  return <div className="group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-lg bg-card border-border hover:border-primary/40">
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground truncate max-w-[130px]">{typeLine ? typeLine.split("—")[0].trim() : "Carta"}</span>
        <div className="flex items-center gap-1.5 shrink-0">{badges}</div>
      </div>
      <button type="button" onClick={onOpen} aria-label={`Ver detalle de ${name}`} className="relative cursor-pointer group/img w-full flex justify-center pt-0.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className={`relative w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-border/80 group-hover/img:border-primary shadow-md group-hover/img:shadow-xl group-hover/img:scale-[1.02] transition-all duration-200 bg-secondary/30 ${isFoil ? "foil-card-effect" : ""}`} style={{ aspectRatio: "63 / 88" }}>
          {imageUri ? <CardImage src={imageUri} alt={name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px" className="object-cover rounded-lg" /> : <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center"><ImageIcon className="w-10 h-10 text-muted-foreground/40" /><span className="text-xs">Sin imagen</span></div>}
          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none"><Eye className="w-7 h-7 text-white drop-shadow-lg" /></div>
        </div>
      </button>
      <div className="space-y-1.5">
        <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug"><button type="button" onClick={onOpen} className="text-left hover:text-primary transition-colors line-clamp-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={name}>{name}</button></h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span className="truncate max-w-[150px]">{typeLine || "Card"}</span><ManaCost manaCost={manaCost} /></div>
        {children}
      </div>
    </div>
    {footer}
  </div>;
}
