import { Link } from "react-router";
import { useT } from "@/shared/i18n/useT";

interface Props {
  parent: { path: string; label: string };
  current: string;
}

export default function Breadcrumbs({ parent, current }: Props) {
  const { t } = useT();
  return (
    <nav aria-label={t("shell.breadcrumb")} className="os-shell-breadcrumb">
      <ol>
        <li><Link to={parent.path}>{parent.label}</Link></li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}
