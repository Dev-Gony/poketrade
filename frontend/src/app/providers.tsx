"use client";

import type { ReactNode } from "react";
import { CurrencyProvider } from "@/currency/CurrencyProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SessionProvider } from "@/session/SessionProvider";

/** 언어·통화·세션 전역 상태. 루트 레이아웃에서 한 번만 감싸므로 페이지를 이동해도 유지된다. */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <CurrencyProvider>
        <SessionProvider>{children}</SessionProvider>
      </CurrencyProvider>
    </I18nProvider>
  );
}
