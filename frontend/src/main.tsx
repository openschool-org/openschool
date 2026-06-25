import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.scss";
import App from "./App.tsx";
import { ThunderIDProvider } from "@thunderid/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThunderIDProvider
      clientId="Yk-roYC3mJrf1SB_oXm_aQ"
      baseUrl="https://localhost:8090"
      afterSignInUrl="http://localhost:5173"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThunderIDProvider>
  </StrictMode>,
);
