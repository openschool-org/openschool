import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { en, type Messages } from "@/shared/i18n/messages/en";
import { I18nContext, interpolate, isLang, type Lang, type Translate } from "@/shared/i18n/i18nContext";
import { saveLanguage } from "@/shared/i18n/languageApi";
import { useProvisionUser, type Me } from "@/shared/auth/useProvisionUser";
import { keys } from "@/shared/api/keys";
import { setDateLocale } from "@/shared/lib/date";

const STORAGE_KEY = "os-lang";

// Sinhala and Tamil load on demand so English users never download them.
const loaders: Record<Exclude<Lang, "en">, () => Promise<Messages>> = {
  si: () => import("@/shared/i18n/messages/si").then((m) => m.si),
  ta: () => import("@/shared/i18n/messages/ta").then((m) => m.ta),
};

function readStored(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: me } = useProvisionUser();
  const [chosen, setChosen] = useState<Lang | null>(null);
  const [catalogues, setCatalogues] = useState<Partial<Record<Lang, Messages>>>({ en });

  // A choice made now wins, then the account's saved language, then this device's last choice.
  const lang: Lang = chosen ?? (isLang(me?.preferred_language) ? me.preferred_language : null) ?? readStored() ?? "en";
  setDateLocale(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === "en" || catalogues[lang]) return;
    let cancelled = false;
    loaders[lang]().then((messages) => !cancelled && setCatalogues((c) => ({ ...c, [lang]: messages })));
    return () => {
      cancelled = true;
    };
  }, [lang, catalogues]);

  const setLang = useCallback(
    (next: Lang) => {
      setChosen(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private mode: the account setting below still remembers it.
      }
      queryClient.setQueryData<Me>(keys.me.profile(), (old) => (old ? { ...old, preferred_language: next } : old));
      void saveLanguage(next).catch(() => {});
    },
    [queryClient],
  );

  const t = useCallback<Translate>((key, vars) => interpolate((catalogues[lang] ?? en)[key] ?? en[key], vars), [catalogues, lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
