import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg-primary">
          <div className="max-w-lg w-full space-y-4">
            <h1 className="font-heading font-bold text-xl text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary text-sm">The page crashed due to an unexpected error. Try refreshing.</p>
            <pre className="text-xs bg-bg-tertiary rounded-lg p-4 overflow-auto text-danger whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
            <button
              className="btn-primary w-full"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
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
