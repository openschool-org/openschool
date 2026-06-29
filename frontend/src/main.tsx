import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.scss";
import App from "./App.tsx";
import { ThunderIDProvider } from "@thunderid/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThunderIDProvider
    clientId="XvilbVz-Fw7oIT2fI8XEeQ"
    baseUrl="https://localhost:8090"
    afterSignInUrl={window.location.origin}
    afterSignOutUrl={window.location.origin}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThunderIDProvider>
  </StrictMode>,
);
