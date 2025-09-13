import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Admin Panel Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to external service if needed
    if (process.env.NODE_ENV === 'production') {
      // You can log to external service here
      console.error('Admin Panel Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    // Clear any problematic state and redirect
    localStorage.removeItem('adminError');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-800 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-white mr-3" />
                  <div>
                    <h1 className="text-xl font-bold text-white">Admin Panel Error</h1>
                    <p className="text-red-100 text-sm">Something went wrong in the admin interface</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    What happened?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    The admin panel encountered an unexpected error. This is isolated from the main application 
                    and won't affect regular users.
                  </p>
                  
                  {this.state.error && (
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Error Details:
                      </h3>
                      <p className="text-sm text-red-600 dark:text-red-400 font-mono">
                        {this.state.error.message}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    What can you do?
                  </h2>
                  <ul className="text-gray-600 dark:text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Try refreshing the admin panel using the button below</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Check if the issue persists after refresh</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Contact system administrator if the problem continues</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Admin Panel
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 font-medium"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Reload Application
                  </button>
                </div>

                {/* Debug Info */}
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-6">
                    <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      Debug Information (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-auto max-h-40">
                      {this.state.error && this.state.error.stack}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
