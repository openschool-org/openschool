import { createContext } from "react";
import { en, type MessageKey } from "@/shared/i18n/messages/en";

export type Lang = "en" | "si" | "ta";
export type Vars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: Vars) => string;

// Each language is named in its own script so a reader can always find theirs.
export const LANGUAGES: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "si", label: "සිංහල" },
  { value: "ta", label: "தமிழ்" },
];

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "si" || value === "ta";
}

export function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

// English-only default so components render correctly in tests and outside the provider.
export const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (key, vars) => interpolate(en[key], vars),
});
