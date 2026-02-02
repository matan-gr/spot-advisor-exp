import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icons } from '../constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400 mb-3">
            <Icons.Cancel size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Component Error</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-xs">
            Something went wrong while loading this component. This might be due to a network issue or a deployment update.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            Reload Page
          </button>
          {this.state.error && (
             <pre className="mt-4 p-2 bg-slate-100 dark:bg-black/20 rounded text-[9px] text-slate-500 font-mono overflow-auto max-w-full">
                 {this.state.error.message}
             </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
