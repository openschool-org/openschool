import { Button, Dropdown } from "antd";
import { TranslationOutlined } from "@ant-design/icons";
import { LANGUAGES } from "@/shared/i18n/i18nContext";
import { useT } from "@/shared/i18n/useT";

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useT();
  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      menu={{
        selectedKeys: [lang],
        items: LANGUAGES.map((l) => ({ key: l.value, label: <span lang={l.value}>{l.label}</span>, onClick: () => setLang(l.value) })),
      }}
    >
      <Button type="text" shape="circle" aria-label={t("shell.language")} icon={<TranslationOutlined />} />
    </Dropdown>
  );
}
