import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends (Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 rtl" dir="rtl">
          <div className="max-w-2xl w-full bg-white rounded-[2rem] p-8 shadow-2xl border-2 border-rose-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-rose-50 rounded-2xl">
                <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900">אופס! משהו השתבש</h1>
                <p className="text-slate-500 font-bold">האפליקציה נתקלה בשגיאה לא צפויה.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 overflow-auto max-h-60 border border-slate-100">
              <p className="text-rose-700 font-mono text-sm mb-2">{(this.state as any).error?.toString()}</p>
              <pre className="text-slate-400 font-mono text-[10px] leading-relaxed">
                {(this.state as any).errorInfo?.componentStack}
              </pre>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:bg-brand-700 transition-all active:scale-95"
              >
                נסה שוב
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-colors"
              >
                איפוס נתונים
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

export default ErrorBoundary;
