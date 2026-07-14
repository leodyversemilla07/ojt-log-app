import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RouteErrorBoundary } from '@/components/error-boundary';

function Boom(): React.ReactElement {
  throw new Error('boom-from-test');
}

function Safe(): React.ReactElement {
  return <div>safe-content</div>;
}

describe('ErrorBoundary', () => {
  // Mute console.error so the React boundary warning doesn't pollute output
  const originalError = console.error;
  beforeAll(() => {
    console.error = () => {};
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when nothing throws', () => {
    render(
      <RouteErrorBoundary>
        <Safe />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('safe-content')).toBeInTheDocument();
  });

  it('catches errors and renders the fallback', () => {
    render(
      <RouteErrorBoundary title="Boom section crashed">
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Boom section crashed')).toBeInTheDocument();
    expect(screen.getByText('boom-from-test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('forwards errors to onError when provided', () => {
    const handler = vi.fn();
    render(
      <RouteErrorBoundary onError={handler}>
        <Boom />
      </RouteErrorBoundary>,
    );
    expect(handler).toHaveBeenCalledTimes(1);
    const [error, info] = handler.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('boom-from-test');
    expect(info).toBeDefined();
  });
});
