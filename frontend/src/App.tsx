import { Routes, Route } from "react-router";
import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";
import Showcase from "./pages/Showcase";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="showcase" element={<Showcase />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
