import type { Locale } from "antd/es/locale";
import enGB from "antd/locale/en_GB";
import type { Lang } from "@/shared/i18n/i18nContext";

// antd ships no Sinhala or Tamil locale, so these override the built-in text people
// actually see (paging, OK / Cancel, empty states, select placeholders) on top of en_GB.
// Draft translations, reviewed with the rest of si.ts and ta.ts.
function build(locale: string, s: {
  perPage: string; jumpTo: string; page: string; prev: string; next: string; prevN: (n: number) => string; nextN: (n: number) => string; pageSize: string;
  ok: string; cancel: string; noData: string; reset: string; select: string; close: string; clear: string;
}): Locale {
  return {
    ...enGB,
    locale,
    Pagination: {
      ...enGB.Pagination,
      items_per_page: s.perPage, jump_to: s.jumpTo, page: s.page, prev_page: s.prev, next_page: s.next,
      prev_5: s.prevN(5), next_5: s.nextN(5), prev_3: s.prevN(3), next_3: s.nextN(3), page_size: s.pageSize,
    },
    Modal: { okText: s.ok, cancelText: s.cancel, justOkText: s.ok },
    Popconfirm: { okText: s.ok, cancelText: s.cancel },
    Empty: { description: s.noData },
    Table: { ...enGB.Table, filterConfirm: s.ok, filterReset: s.reset, emptyText: s.noData },
    global: { ...enGB.global, placeholder: s.select, close: s.close, clear: s.clear },
  };
}

const si = build("si", {
  perPage: "/ පිටුව", jumpTo: "යන්න", page: "පිටුව", prev: "පෙර පිටුව", next: "ඊළඟ පිටුව",
  prevN: (n) => `පෙර පිටු ${n}`, nextN: (n) => `ඊළඟ පිටු ${n}`, pageSize: "පිටු ප්‍රමාණය",
  ok: "හරි", cancel: "අවලංගු කරන්න", noData: "දත්ත නැත", reset: "යළි සකසන්න", select: "තෝරන්න", close: "වසන්න", clear: "හිස් කරන්න",
});

const ta = build("ta", {
  perPage: "/ பக்கம்", jumpTo: "செல்", page: "பக்கம்", prev: "முந்தைய பக்கம்", next: "அடுத்த பக்கம்",
  prevN: (n) => `முந்தைய ${n} பக்கங்கள்`, nextN: (n) => `அடுத்த ${n} பக்கங்கள்`, pageSize: "பக்க அளவு",
  ok: "சரி", cancel: "ரத்து செய்", noData: "தரவு இல்லை", reset: "மீட்டமை", select: "தேர்ந்தெடுக்கவும்", close: "மூடு", clear: "அழி",
});

export const ANTD_LOCALES: Record<Lang, Locale> = { en: enGB, si, ta };
