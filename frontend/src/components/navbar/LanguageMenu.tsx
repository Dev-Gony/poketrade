"use client";

import { usePopover } from "@/hooks/usePopover";
import { LOCALE_LABELS, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/dictionaries";
import { useTranslation } from "@/i18n/I18nProvider";
import { POPOVER_PANEL } from "./styles";

export default function LanguageMenu() {
  const { t, locale, setLocale } = useTranslation();
  const { open, toggle, close, ref } = usePopover();

  const select = (next: Locale) => {
    setLocale(next);
    close();
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("header.language")}
        className={`flex w-[68px] shrink-0 items-center justify-between gap-1 rounded-lg border px-1.5 py-1 font-label-numeric-sm text-label-numeric-sm font-semibold text-on-surface transition-colors ${
          open ? "border-primary bg-surface-container" : "border-outline-variant/40 bg-surface-container-lowest hover:border-primary/60"
        }`}
        onClick={toggle}
        type="button"
      >
        <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant">language</span>
        <span className="shrink-0">{LOCALE_LABELS[locale]}</span>
        <span className={`material-symbols-outlined shrink-0 text-[16px] text-outline transition-transform ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <ul aria-label={t("header.language")} className={`${POPOVER_PANEL} w-40 p-1`} role="listbox">
          {LOCALES.map((code) => {
            const selected = code === locale;
            return (
              <li key={code} aria-selected={selected} role="option">
                <button
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    selected ? "bg-surface-container-high text-primary" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                  lang={code}
                  onClick={() => select(code)}
                  type="button"
                >
                  <span className="w-6 font-label-numeric-sm text-label-numeric-sm font-bold">{LOCALE_LABELS[code]}</span>
                  <span className="flex-1 font-body-md text-body-md">{LOCALE_NAMES[code]}</span>
                  {selected && <span className="material-symbols-outlined text-[16px]">check</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
