import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // You can also log the error to an error reporting service here
        if (process.env.NODE_ENV === 'production') {
            // Log to external service in production
            this.logErrorToService(error, errorInfo);
        }
    }

    logErrorToService = (error, errorInfo) => {
        // Example: Send to error reporting service
        // errorReportingService.logError(error, errorInfo);
        console.log('Error logged to service:', { error, errorInfo });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null 
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
                    <div className="max-w-md w-full mx-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
                            {/* Error Icon */}
                            <div className="text-6xl mb-4">⚠️</div>
                            
                            {/* Error Title */}
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                Oops! Something went wrong
                            </h1>
                            
                            {/* Error Description */}
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                We're sorry, but something unexpected happened. Don't worry, our team has been notified.
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={this.handleReset}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Try Again
                                </button>
                                
                                <button
                                    onClick={this.handleReload}
                                    className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Reload Page
                                </button>
                            </div>
                            
                            {/* Development Error Details */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="mt-6 text-left">
                                    <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Error Details (Development)
                                    </summary>
                                    <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-auto max-h-40">
                                        <div className="mb-2">
                                            <strong>Error:</strong> {this.state.error.toString()}
                                        </div>
                                        {this.state.errorInfo && (
                                            <div>
                                                <strong>Component Stack:</strong>
                                                <pre className="whitespace-pre-wrap mt-1">
                                                    {this.state.errorInfo.componentStack}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;