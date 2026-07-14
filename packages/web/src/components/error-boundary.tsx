import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  /** Inline fallback rendered when used inside an existing card layout */
  inline?: boolean;
  /** Called with (error, info) when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional title override (e.g. "Failed to load logs") */
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the console log for debugging
    console.error('Error caught by boundary:', error, errorInfo);
    // Allow consumers to wire telemetry
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    const title = this.props.title ?? 'Something went wrong';

    if (this.props.inline) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <CardDescription className="text-destructive/80">
              This section failed to render. The rest of the app is still working.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="p-3 bg-destructive/10 rounded-md text-sm font-mono text-destructive overflow-auto max-h-32">
                {error.message}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Full-page fallback for root-level failures
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <CardDescription className="text-destructive/80">
              An unexpected error stopped the app from rendering. Reload to try again, or jump back
              to the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="p-3 bg-destructive/10 rounded-md text-sm font-mono text-destructive overflow-auto max-h-32">
                {error.message}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="size-4" />
                Reload page
              </Button>
              <Button variant="outline" onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="size-4" />
                Try without reloading
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link to="/">
                  <Home className="size-4" />
                  Home
                </Link>
              </Button>
            </div>
          </CardContent>
          {isDev ? (
            <p className="text-xs text-muted-foreground px-6 pb-4">
              Development mode: check the console for component stack.
            </p>
          ) : null}
        </Card>
      </div>
    );
  }
}

/**
 * Convenience helper: use inside a page (e.g. a lazy-loaded route) so a failure
 * only kills that page, not the whole app layout.
 */
export function RouteErrorBoundary({
  children,
  onError,
  title,
}: {
  children: ReactNode;
  onError?: Props['onError'];
  title?: string;
}) {
  return (
    <ErrorBoundary inline onError={onError} title={title}>
      {children}
    </ErrorBoundary>
  );
}
