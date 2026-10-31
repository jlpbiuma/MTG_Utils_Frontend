import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Summary cards (KPIs, totals) as a swipeable row on phones and a grid from
 * `sm` up. Each child keeps most of the screen width on phones, so the next
 * card peeks in and invites a swipe instead of stacking a screen of numbers
 * above the content. Pass the desktop grid columns in `className`.
 */
export function MobileScroller({
  className,
  children,
  label,
}: {
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-mobile-scroller=""
      className={cn(
        "snap-row flex gap-3 overflow-x-auto max-sm:-mx-4 max-sm:px-4 max-sm:pb-1 sm:grid sm:overflow-visible",
        "max-sm:[&>*]:w-[78%] max-sm:[&>*]:shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
