import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.scss";
import App from "./App.tsx";
import { AsgardeoProvider } from "@asgardeo/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AsgardeoProvider
      clientId={import.meta.env.VITE_ASGARDEO_CLIENT_ID}
      baseUrl={import.meta.env.VITE_ASGARDEO_BASE_URL}
      scopes={import.meta.env.VITE_ASGARDEO_SCOPES}
      afterSignInUrl={import.meta.env.VITE_ASGARDEO_AFTER_SIGN_IN_URL || `${window.location.origin}/`}
      afterSignOutUrl={import.meta.env.VITE_ASGARDEO_AFTER_SIGN_OUT_URL || `${window.location.origin}/`}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AsgardeoProvider>
  </StrictMode>,
);
