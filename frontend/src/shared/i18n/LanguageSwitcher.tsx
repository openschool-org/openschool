import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { Translate } from "@carbon/icons-react";
import { LANGUAGES } from "@/shared/i18n/i18nContext";
import { useT } from "@/shared/i18n/useT";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  return (
    <OverflowMenu renderIcon={Translate} aria-label={t("shell.language")} iconDescription={t("shell.language")} flipped className="os-header-user-menu">
      {LANGUAGES.map((l) => (
        <OverflowMenuItem key={l.value} itemText={l.value === lang ? `✓ ${l.label}` : l.label} lang={l.value} onClick={() => setLang(l.value)} />
      ))}
    </OverflowMenu>
  );
}
