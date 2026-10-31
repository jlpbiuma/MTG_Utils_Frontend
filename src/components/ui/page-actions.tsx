import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Page header actions. On phones the secondary actions share a two-column
 * grid and an odd last action (the primary one) spans the full width, at a
 * thumb-friendly height; from `sm` up they are the usual inline row.
 */
export function PageActions({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      data-page-actions=""
      className={cn(
        "grid w-full grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2 [&_button]:w-full max-sm:[&_button]:min-h-11",
        "sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3 sm:[&>*:last-child:nth-child(odd)]:col-auto sm:[&_button]:w-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
