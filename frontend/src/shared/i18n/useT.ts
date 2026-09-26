import { useContext } from "react";
import { I18nContext } from "@/shared/i18n/i18nContext";

export function useT() {
  return useContext(I18nContext);
}
