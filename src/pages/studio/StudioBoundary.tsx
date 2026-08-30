import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logAppError } from "@/lib/logAppError";

/**
 * REDE DE SEGURANÇA DO STUDIO
 *
 * Uma falha em UMA arte (ou no motor de conteúdo de um público específico)
 * derrubava a árvore React inteira e a tela ficava branca — sem mensagem e sem
 * rastro. Aqui o erro é capturado, registrado em `app_errors` (com o público /
 * contexto em que aconteceu) e a pessoa continua no Studio, com um botão para
 * tentar de novo.
 *
 * Nunca remova este limite: qualquer bloco novo do motor passa por dentro dele.
 */
type Props = {
  children: ReactNode;
  /** Contexto textual para o registro do erro (marca, público, formato). */
  context?: string;
  /** Ação opcional oferecida além de "tentar de novo". */
  onReset?: () => void;
};

type State = { error: Error | null };

class StudioBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    logAppError(error, {
      scope: "frontend",
      severity: "error",
      functionName: "StudioBoundary",
      metadata: { context: this.props.context ?? null, componentStack: info.componentStack?.slice(0, 4000) ?? null },
    });
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="mt-5 rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Esta leva não conseguiu ser montada.
        </p>
        <p className="mt-1.5 text-muted-foreground">
          O erro foi registrado. Gere outra versão ou escolha outro público — o restante do Studio continua
          funcionando.
        </p>
        <p className="mt-2 break-words text-xs text-muted-foreground/80">{this.state.error.message}</p>
        <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={this.reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Tentar de novo
        </Button>
      </section>
    );
  }
}

export default StudioBoundary;
