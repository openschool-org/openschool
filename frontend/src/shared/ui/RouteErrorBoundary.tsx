import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { useLocation } from "react-router";

interface State {
  error: Error | null;
}

class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Route render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="os-error-fallback">
        <div className="os-error-fallback__inner">
          <ExclamationCircleFilled className="os-error-fallback__icon" aria-hidden />
          <h1 className="os-error-fallback__title">This page hit an error</h1>
          <p className="os-error-fallback__text">The rest of the app still works. Reload to try this page again.</p>
          <Button type="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}

// Isolates one route's render error; navigating to another route resets it.
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
