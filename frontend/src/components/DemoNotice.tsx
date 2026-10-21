"use client";

import { useTranslation } from "@/i18n/I18nProvider";

export const REPOSITORY_URL = "https://github.com/Dev-Gony/poketrade";

/**
 * 모든 페이지 상단(헤더 바로 아래)에 항상 보이는 데모 고지.
 * 화면의 시세·인증·보험·회사 정보가 실제처럼 보이지 않도록, 학습용 데모이며 예시 데이터라는 점을 명시한다.
 */
export default function DemoNotice() {
  const { t } = useTranslation();
  return (
    <div className="w-full border-b border-secondary/20 bg-secondary-container/10" role="note">
      <div className="mx-auto flex max-w-7xl items-start gap-2 px-margin py-2 font-body-sm text-body-sm text-on-surface-variant sm:items-center">
        <span className="material-symbols-outlined shrink-0 text-[16px] text-secondary">info</span>
        <p className="flex-1">{t("notice.demo")}</p>
        <a
          className="hidden shrink-0 items-center gap-0.5 font-semibold text-secondary hover:underline sm:flex"
          href={`${REPOSITORY_URL}#readme`}
          rel="noreferrer"
          target="_blank"
        >
          {t("notice.learnMore")}
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
        </a>
      </div>
    </div>
  );
}
