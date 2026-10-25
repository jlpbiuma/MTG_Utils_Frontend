"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { CardImage as Image } from "@/components/card-image";
import { getCardDetails } from "@/lib/card-details-client";
import { cn } from "@/lib/utils";

interface CardPreviewHoverProps {
  cardName: string;
  imageUri?: string | null;
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}

export function CardPreviewHover({
  cardName,
  imageUri,
  children,
  className,
  size = "lg",
}: CardPreviewHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [triggerRect, setTriggerRect] = useState<{ top: number; left: number; right: number } | null>(null);
  const [dynamicImageUri, setDynamicImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const effectiveImageUri = imageUri || dynamicImageUri;

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    setIsHovered(true);
    setMousePos({ x: e.clientX, y: e.clientY });
    const rect = e.currentTarget.getBoundingClientRect();
    setTriggerRect({ top: rect.top, left: rect.left, right: rect.right });

    if (!imageUri && !dynamicImageUri && cardName) {
      setIsLoading(true);
      getCardDetails({ name: cardName })
        .then((details) => {
          if (details) {
            const uri =
              details.image_uris?.normal ??
              details.image_uris?.large ??
              details.image_uris?.small ??
              details.card_faces?.[0]?.image_uris?.normal ??
              details.card_faces?.[0]?.image_uris?.large ??
              details.printings?.[0]?.image_uri ??
              null;
            if (uri) setDynamicImageUri(uri);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoading(false);
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    setIsHovered(false);
  };

  const dimensions =
    size === "xl"
      ? { width: 360, height: 504 }
      : size === "md"
      ? { width: 240, height: 336 }
      : { width: 320, height: 448 }; // Default "lg": large, sharp, easily distinguished

  return (
    <span
      className={cn("relative inline-block cursor-pointer", className)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isHovered && (effectiveImageUri || isLoading) && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150 ease-out shadow-2xl drop-shadow-2xl"
          style={(() => {
            const { width, height } = dimensions;
            const gap = 14;
            const top = triggerRect
              ? Math.max(8, Math.min(triggerRect.top - 20, window.innerHeight - height - 8))
              : Math.max(8, Math.min(mousePos.y - height / 2, window.innerHeight - height - 8));
            const preferredLeft = triggerRect ? triggerRect.right + gap : mousePos.x + gap;
            const left = preferredLeft + width <= window.innerWidth - 8
              ? preferredLeft
              : triggerRect
                ? Math.max(8, triggerRect.left - width - gap)
                : Math.max(8, mousePos.x - width - gap);
            return { left, top };
          })()}
        >
          <div
            style={{ width: `${dimensions.width}px` }}
            className="rounded-xl overflow-hidden border-2 border-primary/50 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md foil-card-effect animate-in fade-in zoom-in-95 duration-150"
          >
            {effectiveImageUri ? (
              <Image
                src={effectiveImageUri}
                alt={cardName}
                width={dimensions.width}
                height={dimensions.height}
                sizes={`${dimensions.width}px`}
                className="w-full h-auto rounded-lg object-cover shadow-md"
                priority
              />
            ) : (
              <div
                style={{ height: `${dimensions.height}px` }}
                className="w-full flex flex-col items-center justify-center gap-3 rounded-lg bg-slate-900 text-slate-400 p-4 text-center"
              >
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                <span className="text-xs font-semibold text-slate-200">{cardName}</span>
                <span className="text-[11px] text-slate-500">Cargando previsualización…</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
