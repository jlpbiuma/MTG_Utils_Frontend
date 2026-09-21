"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  tabName?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("TabErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center my-6 space-y-4 max-w-xl mx-auto">
          <div className="h-12 w-12 mx-auto rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Error al cargar {this.props.tabName || "esta sección"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Ocurrió un problema temporal al renderizar el contenido. Puedes intentar recargar la pestaña sin perder tus datos.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-[11px] font-mono text-muted-foreground/80 bg-background/50 p-2 rounded border border-border">
              {this.state.error.message}
            </p>
          )}
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleReset}
              className="gap-2 border-border hover:bg-background"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reintentar pestaña</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
