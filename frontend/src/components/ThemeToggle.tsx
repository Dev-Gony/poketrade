"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/I18nProvider";

export const THEME_STORAGE_KEY = "poketrade-theme";
const TRANSITION_MS = 350;

export default function ThemeToggle() {
  const { t } = useTranslation();
  // 기본값은 다크. 실제 상태는 layout 의 인라인 스크립트가 <html> 에 반영해 둔 클래스를 따른다.
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !isDark;

    // 전환 순간에만 색상 transition 을 걸어 부드럽게 바뀌게 한다.
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next);
    window.setTimeout(() => root.classList.remove("theme-transition"), TRANSITION_MS);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // ignore
    }
    setIsDark(next);
  };

  const label = isDark ? t("theme.toLight") : t("theme.toDark");

  return (
    <button
      aria-label={label}
      className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
      onClick={toggle}
      title={label}
      type="button"
    >
      <span className="material-symbols-outlined text-[22px]">{isDark ? "light_mode" : "dark_mode"}</span>
    </button>
  );
}
