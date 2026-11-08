import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";

interface State {
  error: Error | null;
}

// Last-resort guard so an unhandled render error never blanks the whole page.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="os-error-fallback os-error-fallback--full">
        <div className="os-error-fallback__inner">
          <ExclamationCircleFilled className="os-error-fallback__icon" aria-hidden />
          <h1 className="os-error-fallback__title">Something went wrong</h1>
          <p className="os-error-fallback__text">
            An unexpected error occurred. Reloading usually fixes this. If it keeps happening, contact your administrator.
          </p>
          <Button type="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
