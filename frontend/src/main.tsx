import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.scss";
import App from "./App.tsx";
import { ThunderIDProvider } from "@thunderid/react";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThunderIDProvider
      applicationId="019ef471-fd6a-7396-be8a-fd78cd972664"
      baseUrl="https://localhost:8090"
      signInUrl="http://localhost:5173/signin"
      afterSignInUrl="/"
      afterSignOutUrl="/signin"
      preferences={{
        theme: {
          inheritFromBranding: false,
        },
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThunderIDProvider>
  </StrictMode>,
);
