import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, componentStack: '' };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      const message = err?.message || String(err);
      const stack = err?.stack || '';
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary">
          <div className="max-w-3xl w-full space-y-4">
            <h1 className="font-heading font-bold text-xl text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary text-sm">The page crashed due to an unexpected error.</p>
            <div className="space-y-2">
              <p className="text-xs text-text-tertiary uppercase tracking-wide">Error</p>
              <pre className="text-xs bg-bg-tertiary rounded-lg p-4 overflow-auto text-danger whitespace-pre-wrap max-h-40">
                {message}
              </pre>
            </div>
            {this.state.componentStack && (
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary uppercase tracking-wide">Component Stack</p>
                <pre className="text-xs bg-bg-tertiary rounded-lg p-4 overflow-auto text-text-secondary whitespace-pre-wrap max-h-60">
                  {this.state.componentStack}
                </pre>
              </div>
            )}
            {stack && (
              <details className="space-y-2">
                <summary className="text-xs text-text-tertiary uppercase tracking-wide cursor-pointer">Stack Trace</summary>
                <pre className="text-xs bg-bg-tertiary rounded-lg p-4 overflow-auto text-text-secondary whitespace-pre-wrap max-h-60 mt-2">
                  {stack}
                </pre>
              </details>
            )}
            <button
              className="btn-primary w-full"
              onClick={() => { this.setState({ error: null, componentStack: '' }); window.location.reload(); }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
