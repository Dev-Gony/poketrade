"use client";

import { useCurrency } from "@/currency/CurrencyProvider";
import { LIVE_TRADES } from "@/data/marketInsights";
import { useTranslation } from "@/i18n/I18nProvider";

export default function LiveTradesTicker() {
  const { t, pick } = useTranslation();
  const { format } = useCurrency();
  // 원본과 동일하게 앞쪽 3건을 뒤에 반복해 끊김 없는 마퀴처럼 보이게 한다.
  const loop = [...LIVE_TRADES, ...LIVE_TRADES.slice(0, 3)];

  return (
    <div className="w-full h-8 bg-surface-container-lowest border-t border-outline-variant/20 overflow-hidden flex items-center">
      <div className="flex items-center px-4 shrink-0 bg-surface-container-lowest z-10 border-r border-outline-variant/30">
        <span className="whitespace-nowrap font-label-caps text-label-caps uppercase text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">bolt</span> {t("header.liveTrades")}
        </span>
      </div>
      <div className="overflow-hidden w-full relative">
        <div className="animate-ticker items-center gap-8 text-on-surface-variant">
          {loop.map((trade, i) => {
            return (
              <span key={i} className="flex items-center gap-2 font-label-numeric-sm text-label-numeric-sm">
                <span className="text-on-surface font-medium">
                  {pick(trade.name)} {trade.grade}
                </span>
                <span className="text-outline-variant">•</span>
                {trade.krw !== undefined ? (
                  <>
                    <span>{t(trade.actionKey)}</span>
                    <span className="text-secondary font-semibold">{format(trade.krw)}</span>
                  </>
                ) : (
                  <span className="text-tertiary">{t(trade.actionKey)}</span>
                )}
                <span className="text-outline">|</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
