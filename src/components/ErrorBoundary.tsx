import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6 shadow-lg">
                        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The application encountered an error and could not load.
                        </p>
                        <div className="bg-gray-100 dark:bg-gray-950 p-4 rounded text-xs font-mono overflow-auto max-h-48 mb-4 border dark:border-gray-700">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                            onClick={() => window.location.reload()}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
