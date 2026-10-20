"use client";

import { useEffect } from "react";
import { useTranslation } from "@/i18n/I18nProvider";

/**
 * 백엔드에 연결하지 못해 데모 데이터를 보여 줄 때 화면 우측 상단(헤더 아래)에 조용히 표시하는 뱃지.
 * 화면을 막지 않고, 브라우저 콘솔에도 한 번 경고를 남긴다.
 */
export default function DemoModeBadge() {
  const { t } = useTranslation();

  useEffect(() => {
    console.warn("[PokeTrade] 백엔드에 연결할 수 없어 데모(오프라인) 데이터를 표시합니다.");
  }, []);

  return (
    <div
      className="fixed right-4 top-[7.5rem] z-40 flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-lowest/85 px-2.5 py-1 font-label-numeric-sm text-label-numeric-sm text-on-surface-variant shadow-sm backdrop-blur-md"
      role="status"
      title={t("demo.tooltip")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
      {t("demo.badge")}
    </div>
  );
}
