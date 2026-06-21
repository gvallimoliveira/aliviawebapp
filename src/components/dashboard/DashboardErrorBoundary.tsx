import { Component, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[DashboardErrorBoundary]", error, info.componentStack);
    // Stale chunk after a redeploy: the old index.html references chunk
    // filenames that no longer exist. Trigger the global reload guard
    // in main.tsx so the user gets the fresh manifest automatically.
    const msg = error?.message || "";
    if (/Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk [\d]+ failed|error loading dynamically imported module/i.test(msg)) {
      try {
        const last = Number(sessionStorage.getItem("alivia:chunk-reload") || "0");
        if (Date.now() - last >= 10_000) {
          sessionStorage.setItem("alivia:chunk-reload", String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">{this.props.fallbackTitle || "Algo deu errado"}</p>
              <p className="text-sm text-muted-foreground mt-1">Tente recarregar esta seção.</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => this.setState({ hasError: false })}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default DashboardErrorBoundary;
