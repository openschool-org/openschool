import { Outlet } from "react-router";
import { Header } from "@carbon/react";
import { AppHeaderBrand, AppHeaderActions } from "../components/AppHeaderChrome";

export default function StudentLayout() {
  return (
    <>
      <Header aria-label="OpenSchool">
        <AppHeaderBrand />
        <AppHeaderActions />
      </Header>

      <main className="os-teacher-content">
        <Outlet />
      </main>
    </>
  );
}
