import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
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

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
          <p className="max-w-md text-sm text-gray-500">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
