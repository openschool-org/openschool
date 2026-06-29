import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.scss";
import App from "./App.tsx";
import { ThunderIDProvider } from "@thunderid/react";
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
    <ThunderIDProvider
      clientId="Yk-roYC3mJrf1SB_oXm_aQ"
      baseUrl="https://localhost:8090"
      afterSignInUrl="http://localhost:5173"
      afterSignOutUrl="http://localhost:5173"
      organizationHandle="default"
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThunderIDProvider>
  </StrictMode>,
);
