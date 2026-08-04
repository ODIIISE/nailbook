"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-lg font-bold text-destructive">!</span>
            </div>
            <h3 className="text-body font-bold text-foreground">خطایی رخ داد</h3>
            <p className="text-caption text-muted-foreground">لطفاً دوباره تلاش کنید</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="h-10 px-4 rounded-xl bg-foreground text-background text-caption font-bold hover:bg-foreground/90 transition-colors"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
