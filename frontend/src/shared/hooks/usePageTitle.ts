import { createContext, useContext, useEffect } from "react";

type SetTitle = (title: string | null) => void;

export const PageTitleContext = createContext<SetTitle>(() => {});

// Overrides the nav-derived tab title and last breadcrumb, e.g. with a student's name.
export function usePageTitle(title: string | null | undefined) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    if (!title) return;
    setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}
