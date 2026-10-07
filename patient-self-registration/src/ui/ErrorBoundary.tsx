import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
  reference: string;
}

/**
 * A failed render shows a calm error state with a way forward and a
 * reference the patient can quote to reception (DESIGN_SYSTEM §10.10) —
 * never a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, reference: '' };

  static getDerivedStateFromError(error: Error): State {
    return { error, reference: `ERR-${Date.now().toString(36).toUpperCase()}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[patient-self-registration]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-14 text-center text-ink">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-critical-bg text-critical-fg" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.6 2.7 20h18.6L12 3.6z" />
            <path d="M12 10v4.2" />
            <path d="M12 17.2v.6" />
          </svg>
        </span>
        <h1 className="text-base font-semibold">Something went wrong</h1>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
          This page could not be shown. Reload to try again — if it keeps happening, reception can help you register.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2"
        >
          Reload
        </button>
        <p className="mt-3 text-xs text-ink-subtle">Reference {this.state.reference}</p>
      </div>
    );
  }
}
