import api from "@/shared/api/client";
import type { Lang } from "@/shared/i18n/i18nContext";

export const saveLanguage = (language: Lang) => api.put("/me/language", { language });
