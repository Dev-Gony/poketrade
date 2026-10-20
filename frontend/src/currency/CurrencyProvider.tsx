"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const CURRENCIES = ["KRW", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** 고정 환율 (1 USD = 1,350 KRW). 실서비스에서는 환율 API 값으로 교체한다. */
export const KRW_PER_USD = 1350;

const STORAGE_KEY = "poketrade-currency";
const DEFAULT_CURRENCY: Currency = "KRW";

const SYMBOLS: Record<Currency, string> = { KRW: "₩", USD: "$" };

// 통화 기호와 자릿수 구분은 언어와 무관하게 동일하게 보여 주기 위해 en-US 포맷을 고정 사용한다.
const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

type FormatOptions = { compact?: boolean };

/** 모든 금액은 KRW 정수로 보관하고, 표시 시점에만 선택 통화로 환산한다. */
export function convertFromKrw(krw: number, currency: Currency) {
  return currency === "KRW" ? krw : krw / KRW_PER_USD;
}

export function formatMoney(krw: number, currency: Currency, { compact = false }: FormatOptions = {}) {
  const amount = convertFromKrw(krw, currency);
  const number = compact ? compactFormat.format(amount) : integerFormat.format(Math.round(amount));
  return `${SYMBOLS[currency]}${number}`;
}

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  /** 선택 통화로 표시 (예: ₩1,920,000 / $1,422) */
  format: (krw: number, options?: FormatOptions) => string;
  /** 보조 표기용 반대 통화 (예: ≈ $1,422 USD / ≈ ₩1,920,000 KRW) */
  formatAlt: (krw: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const isCurrency = (value: unknown): value is Currency => CURRENCIES.includes(value as Currency);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isCurrency(stored)) setCurrencyState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const format = useCallback((krw: number, options?: FormatOptions) => formatMoney(krw, currency, options), [currency]);

  const formatAlt = useCallback(
    (krw: number) => {
      const other: Currency = currency === "KRW" ? "USD" : "KRW";
      return `≈ ${formatMoney(krw, other)} ${other}`;
    },
    [currency],
  );

  const value = useMemo(() => ({ currency, setCurrency, format, formatAlt }), [currency, setCurrency, format, formatAlt]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within <CurrencyProvider>");
  return ctx;
}

/** 서버 컴포넌트에서도 쓸 수 있는 가격 텍스트. 통화 전환 시 즉시 다시 그려진다. */
export function Price({ krw, compact }: { krw: number; compact?: boolean }) {
  const { format } = useCurrency();
  return <>{format(krw, { compact })}</>;
}

/** 반대 통화 보조 표기 */
export function AltPrice({ krw }: { krw: number }) {
  const { formatAlt } = useCurrency();
  return <>{formatAlt(krw)}</>;
}
