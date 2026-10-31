"use client";

import { useId, useState, type ReactNode, type FormEventHandler } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const toolbarButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

/**
 * Search, filters, sorting, display and actions for a list view.
 *
 * Phones (below md) keep the search and the actions visible and fold
 * filters, sorting and display into a "Filtros y orden" panel, so results
 * start within the first screen. ``activeFilters`` shows how many options
 * differ from their defaults while the panel is closed. From md up the layout
 * is the single wrapping row it always was.
 */
export function ViewToolbar({
  label = "Opciones y filtros",
  search,
  filters,
  sorting,
  display,
  actions,
  activeFilters = 0,
  className,
}: {
  label?: string;
  search?: ReactNode;
  filters?: ReactNode;
  sorting?: ReactNode;
  display?: ReactNode;
  actions?: ReactNode;
  activeFilters?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const foldable = Boolean(filters || sorting || display);
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3 [&_button]:min-h-11",
        className,
      )}
    >
      {search && (
        <div data-toolbar-slot="search" className="min-w-0 flex-[1_1_16rem]">
          {search}
        </div>
      )}
      {foldable && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            toolbarButtonClass,
            "w-full justify-between border-border bg-card text-foreground md:hidden",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            Filtros y orden
            {activeFilters > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {activeFilters}
              </span>
            )}
          </span>
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      )}
      {foldable && (
        <div
          id={panelId}
          data-toolbar-panel=""
          data-open={open ? "true" : "false"}
          className={cn(
            "w-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-card/60 p-3 md:contents",
            open ? "flex" : "hidden",
          )}
        >
          {filters && (
            <div
              data-toolbar-slot="filters"
              className="flex min-w-0 max-w-full flex-wrap items-center gap-3"
            >
              {filters}
            </div>
          )}
          {sorting && (
            <div
              data-toolbar-slot="sorting"
              className="flex min-w-0 max-w-full flex-wrap items-center gap-3"
            >
              {sorting}
            </div>
          )}
          {display && (
            <div
              data-toolbar-slot="display"
              className="flex min-w-0 max-w-full flex-wrap items-center gap-3"
            >
              {display}
            </div>
          )}
        </div>
      )}
      {actions && (
        <div
          data-toolbar-slot="actions"
          className="flex min-w-0 max-w-full flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder,
  label = placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const field = (
    <div className="relative min-w-0">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full border-border bg-input pl-9 text-sm"
      />
    </div>
  );
  return onSubmit ? <form onSubmit={onSubmit}>{field}</form> : field;
}

export interface ToolbarOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}
export function ToolbarChoices<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly ToolbarOption<T>[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        // Phones: one swipeable row instead of several wrapped lines of chips.
        "snap-row flex min-w-0 max-w-full items-center gap-1 overflow-x-auto max-md:-mx-1 max-md:px-1 md:flex-wrap md:overflow-visible [&>button]:shrink-0",
        className,
      )}
    >
      <span className="mr-1 shrink-0 text-xs font-medium text-muted-foreground">
        {label}:
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled || option.disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            toolbarButtonClass,
            value === option.value
              ? "border-primary/30 bg-primary/20 text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToolbarToggle({
  children,
  pressed,
  onClick,
  label,
}: {
  children: ReactNode;
  pressed: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        toolbarButtonClass,
        pressed
          ? "border-primary/30 bg-primary/20 text-primary"
          : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ToolbarSort<T extends string>({
  value,
  direction,
  onChange,
  options,
  label = "Ordenar por",
}: {
  value: T;
  direction: "asc" | "desc";
  onChange: (value: T, direction: "asc" | "desc") => void;
  options: readonly (ToolbarOption<T> & { defaultDesc?: boolean })[];
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex min-w-0 max-w-full flex-wrap items-center gap-1"
    >
      <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
        {label}:
      </span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={option.disabled}
          onClick={() =>
            onChange(
              option.value,
              value === option.value
                ? direction === "asc"
                  ? "desc"
                  : "asc"
                : option.defaultDesc
                  ? "desc"
                  : "asc",
            )
          }
          className={cn(
            toolbarButtonClass,
            value === option.value
              ? "border-primary/30 bg-primary/20 text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
          )}
        >
          {option.icon}
          {option.label}
          {value === option.value &&
            (direction === "asc" ? (
              <ArrowUp aria-hidden="true" className="h-3 w-3" />
            ) : (
              <ArrowDown aria-hidden="true" className="h-3 w-3" />
            ))}
        </button>
      ))}
      <button
        type="button"
        aria-label={
          direction === "asc"
            ? "Orden ascendente: cambiar a descendente"
            : "Orden descendente: cambiar a ascendente"
        }
        onClick={() => onChange(value, direction === "asc" ? "desc" : "asc")}
        className={cn(
          toolbarButtonClass,
          "border-border text-muted-foreground hover:bg-secondary",
        )}
      >
        {direction === "asc" ? (
          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
        ) : (
          <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
        )}
        {direction === "asc" ? "Ascendente" : "Descendente"}
      </button>
    </div>
  );
}
