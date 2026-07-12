import type { ReactNode } from 'react';
import { Component } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled app error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please refresh the page. If this keeps happening, contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
