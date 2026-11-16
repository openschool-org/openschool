import type { ReactNode } from "react";
import { useLocation } from "react-router";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";

// Isolates one route's render error; navigating to another route resets it.
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary key={pathname} variant="route">
      {children}
    </ErrorBoundary>
  );
}
