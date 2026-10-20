"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "@/i18n/I18nProvider";

/** 백엔드에 연결하지 못했을 때 보여 주는 안내. 다시 시도하면 서버 컴포넌트를 새로 불러온다. */
export default function BackendUnavailable({ backendUrl }: { backendUrl: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-xl mx-auto my-16 px-margin flex flex-col items-center text-center gap-space-md" role="alert">
      <div className="w-16 h-16 rounded-2xl bg-error-container/30 flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-error">cloud_off</span>
      </div>
      <h1 className="font-headline-md text-headline-md text-on-surface font-bold">{t("backend.unavailableTitle")}</h1>
      <p className="font-body-md text-body-md text-outline">{t("backend.unavailableBody", { url: backendUrl })}</p>
      <button
        className="mt-space-sm px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-bold flex items-center gap-1.5 hover:brightness-110 transition-all disabled:opacity-60"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
        type="button"
      >
        <span className={`material-symbols-outlined text-[18px] ${pending ? "animate-spin" : ""}`}>refresh</span>
        {t("backend.retry")}
      </button>
    </div>
  );
}
