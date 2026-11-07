import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ThunderIDProvider } from "@thunderid/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import "@/shared/styles/index.scss";
import App from "@/app/App";
import { queryClient } from "@/app/queryClient";
import ErrorBoundary from "@/shared/ui/ErrorBoundary";
import { ToastProvider } from "@/shared/ui/toast/ToastContext";
import { I18nProvider } from "@/shared/i18n/I18nProvider";
import { buildAntdTheme } from "@/shared/theme/antdTheme";

// Resolved once, after index.scss has published the --os-* tokens on :root.
const antdTheme = buildAntdTheme();
const origin = `${window.location.origin}/`;

// A data router is needed for useBlocker; App keeps its own <Routes> under one catch-all route.
const router = createBrowserRouter([
  { path: "*", element: <ErrorBoundary><App /></ErrorBoundary> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThunderIDProvider
        clientId={import.meta.env.VITE_THUNDERID_CLIENT_ID}
        baseUrl={import.meta.env.VITE_THUNDERID_BASE_URL}
        scopes={import.meta.env.VITE_THUNDERID_SCOPES}
        afterSignInUrl={import.meta.env.VITE_THUNDERID_AFTER_SIGN_IN_URL || origin}
        afterSignOutUrl={import.meta.env.VITE_THUNDERID_AFTER_SIGN_OUT_URL || origin}
      >
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={antdTheme}>
            <ToastProvider>
              <I18nProvider>
                <RouterProvider router={router} />
              </I18nProvider>
            </ToastProvider>
          </ConfigProvider>
        </QueryClientProvider>
      </ThunderIDProvider>
    </ErrorBoundary>
  </StrictMode>,
);
