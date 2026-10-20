"use client";

import { useCurrency } from "@/currency/CurrencyProvider";

const LABELS = { KRW: "KRW (₩)", USD: "USD ($)" } as const;

/** 현재 표시 통화. 헤더의 KRW/USD 토글과 같은 전역 상태를 따른다. */
export default function CurrencyBadge() {
  const { currency } = useCurrency();
  return (
    <span className="px-2.5 py-1 rounded-md bg-surface-container font-label-numeric-sm text-label-numeric-sm text-secondary font-bold">
      {LABELS[currency]}
    </span>
  );
}
