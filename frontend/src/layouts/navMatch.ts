import type { NavGroup, NavItem } from "@/layouts/nav/types";
import type { Translate } from "@/shared/i18n/i18nContext";

export interface NavMatch {
  item: NavItem | null;
  // True when the route sits below the nav page, e.g. /students/123 under /students.
  nested: boolean;
}

function matches(pathname: string, item: NavItem) {
  if (item.exact || item.path === "/") return pathname === item.path;
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

// Finds the nav item a route belongs to. `aliases` maps routes outside the nav to their owner page.
export function matchNav(pathname: string, groups: NavGroup[], aliases: Record<string, string> = {}): NavMatch {
  const items = groups.flatMap((g) => g.items);
  const byPath = (path: string) => items.find((i) => i.path === path) ?? null;

  if (aliases[pathname]) return { item: byPath(aliases[pathname]), nested: false };

  const best = items.filter((i) => matches(pathname, i)).sort((a, b) => b.path.length - a.path.length)[0];
  if (best) return { item: best, nested: pathname !== best.path };

  const alias = Object.keys(aliases)
    .filter((prefix) => pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (alias) return { item: byPath(aliases[alias]), nested: true };

  return { item: null, nested: false };
}

// Fallback label for the last breadcrumb when the page does not set its own title.
export function leafLabel(pathname: string, t: Translate) {
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  if (last === "new") return "New";
  if (last === "mark") return "Mark attendance";
  return t("shell.details");
}
