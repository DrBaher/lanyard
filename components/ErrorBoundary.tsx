"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level safety net: if any screen throws during render, show a recoverable
 * fallback instead of a blank white page. Local-only app, so "Try again" +
 * "Reload" is enough — nothing to report to a server.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface in the console for debugging; no external reporting by design.
    console.error("UI error boundary caught:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold text-fg">Something went wrong</h1>
        <p className="muted">
          This screen hit an unexpected error. Your saved schedule and contacts
          are stored on this device and are safe.
        </p>
        <div className="flex justify-center gap-2">
          <button className="btn btn-brand" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button className="btn" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
