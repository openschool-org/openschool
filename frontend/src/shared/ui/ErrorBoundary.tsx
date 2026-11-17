import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";

interface State {
  error: Error | null;
}

interface Props {
  children: ReactNode;
  // "app" covers the whole page; "route" covers one page inside the shell.
  variant?: "app" | "route";
}

const COPY = {
  app: {
    log: "Unhandled render error:",
    title: "Something went wrong",
    text: "An unexpected error occurred. Reloading usually fixes this. If it keeps happening, contact your administrator.",
  },
  route: {
    log: "Route render error:",
    title: "This page hit an error",
    text: "The rest of the app still works. Reload to try this page again.",
  },
};

// Last-resort guard so an unhandled render error never blanks the whole page.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(COPY[this.props.variant ?? "app"].log, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const variant = this.props.variant ?? "app";
    const copy = COPY[variant];
    return (
      <div className={`os-error-fallback${variant === "app" ? " os-error-fallback--full" : ""}`}>
        <div className="os-error-fallback__inner">
          <ExclamationCircleFilled className="os-error-fallback__icon" aria-hidden />
          <h1 className="os-error-fallback__title">{copy.title}</h1>
          <p className="os-error-fallback__text">{copy.text}</p>
          <Button type="primary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    );
  }
}
