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

  const dimensions =
    size === "xl"
      ? { width: 360, height: 504 }
      : size === "md"
      ? { width: 240, height: 336 }
      : { width: 320, height: 448 }; // Default "lg": large, sharp, easily distinguished

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
          className="fixed z-[9999] pointer-events-none transition-opacity duration-150 ease-out shadow-2xl drop-shadow-2xl"
          style={(() => {
            const rect = triggerRef.current?.getBoundingClientRect();
            const { width, height } = dimensions;
            const gap = 14;
            const top = rect
              ? Math.max(8, Math.min(rect.top - 20, window.innerHeight - height - 8))
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
          <div
            style={{ width: `${dimensions.width}px` }}
            className="rounded-xl overflow-hidden border-2 border-primary/50 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md foil-card-effect animate-in fade-in zoom-in-95 duration-150"
          >
            <Image
              src={imageUri}
              alt={cardName}
              width={dimensions.width}
              height={dimensions.height}
              sizes={`${dimensions.width}px`}
              className="w-full h-auto rounded-lg object-cover shadow-md"
              priority
            />
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
