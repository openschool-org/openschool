import { Routes, Route } from "react-router";
import { SignIn } from "@thunderid/react";
import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";
import Showcase from "./pages/Showcase";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route
        path="/signin"
        element={
          <div className="thunderid-signin-wrapper">
            <div className="thunderid-signin-card">
              <SignIn />
            </div>
          </div>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <RootLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
