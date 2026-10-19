import { Component, ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Shows a recoverable message instead of a blank screen when a page crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="surface-card max-w-sm space-y-4 p-6">
          <h1 className="text-lg font-semibold">Algo salió mal</h1>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error al cargar esta pantalla. Intenta de nuevo.
          </p>
          <p className="break-words text-xs text-muted-foreground">{this.state.error.message}</p>
          <button
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }
}
