import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@carbon/react";
import { WarningAltFilled } from "@carbon/icons-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// A top-level guard against any single unguarded render-time exception
// blanking the entire page — the app previously had no ErrorBoundary
// anywhere (audit.md, "Systemic risks" #1), so a bug like M-12's unguarded
// `label[0]` could take down the whole admin dashboard with nothing but a
// blank screen. React error boundaries must be class components — there is
// no hook equivalent.
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error caught by ErrorBoundary:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ maxWidth: "26rem", textAlign: "center" }}>
            <WarningAltFilled size={32} style={{ fill: "#da1e28", marginBottom: "1rem" }} />
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: 600, color: "#161616" }}>
              Something went wrong
            </h1>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#525252" }}>
              An unexpected error occurred. Reloading the page usually fixes this — if it keeps happening,
              contact your administrator.
            </p>
            <Button kind="primary" onClick={this.handleReload}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
