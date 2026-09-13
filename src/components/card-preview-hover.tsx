"use client";

import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { CardImage as Image } from "@/components/card-image";
import { cn } from "@/lib/utils";

interface CardPreviewHoverProps {
  cardName: string;
  imageUri?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function CardPreviewHover({
  cardName,
  imageUri,
  children,
  className,
}: CardPreviewHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-block cursor-pointer", className)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isHovered && imageUri && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150 ease-out"
          style={(() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            const width = 240;
            const height = 336;
            const gap = 12;
            const top = rect
              ? Math.max(8, Math.min(rect.top, window.innerHeight - height - 8))
              : Math.max(8, Math.min(mousePos.y - height / 2, window.innerHeight - height - 8));
            const preferredLeft = rect ? rect.right + gap : mousePos.x + gap;
            const left = preferredLeft + width <= window.innerWidth - 8
              ? preferredLeft
              : rect
                ? Math.max(8, rect.left - width - gap)
                : Math.max(8, mousePos.x - width - gap);
            return { left, top };
          })()}
        >
          <div className="w-[240px] rounded-xl overflow-hidden border border-amber-500/40 shadow-2xl shadow-black/80 bg-slate-950 p-1 foil-card-effect">
            <Image src={imageUri} alt={cardName} width={240} height={336} sizes="240px" className="w-full h-auto rounded-lg object-cover" priority />
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
