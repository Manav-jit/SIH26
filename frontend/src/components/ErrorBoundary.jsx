import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("3D Scene Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-950/20 text-red-500 flex-col gap-4 p-8 text-center">
          <h2 className="text-xl font-bold">3D Rendering Crashed</h2>
          <p className="text-sm opacity-80 max-w-md">{this.state.error?.message || "Unknown WebGL Error"}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-900 border border-red-500 rounded-lg text-white mt-4"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
