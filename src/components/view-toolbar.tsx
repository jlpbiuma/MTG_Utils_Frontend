"use client";

import type { ReactNode, FormEventHandler } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const toolbarButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function ViewToolbar({
  label = "Opciones y filtros",
  search,
  filters,
  sorting,
  display,
  actions,
  className,
}: {
  label?: string;
  search?: ReactNode;
  filters?: ReactNode;
  sorting?: ReactNode;
  display?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
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
        "flex min-w-0 max-w-full flex-wrap items-center gap-1",
        className,
      )}
    >
      <span className="mr-1 text-xs font-medium text-muted-foreground">
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
