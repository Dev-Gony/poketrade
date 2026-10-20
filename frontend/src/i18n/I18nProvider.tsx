"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, DICTIONARIES, INTL_LOCALES, LOCALES, type Locale, type LocalizedText, type TranslationKey } from "./dictionaries";

// 기본 언어를 ko 로 바꾸면서 키를 올려, 이전 기본값(en)으로 저장된 값이 첫 진입 언어를 덮어쓰지 않게 한다.
const STORAGE_KEY = "poketrade-locale-v2";

type Vars = Record<string, string | number>;
type NodeVars = Record<string, ReactNode>;

type I18nContextValue = {
  locale: Locale;
  /** Intl.NumberFormat / DateTimeFormat / RelativeTimeFormat 용 BCP 47 태그 */
  intlLocale: string;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Vars) => string;
  /** 자리표시자에 <strong> 같은 React 노드를 끼워 넣어야 할 때 사용 */
  tRich: (key: TranslationKey, nodes: NodeVars) => ReactNode;
  /** 카드명처럼 데이터 자체가 언어별 원문을 가진 경우 현재 언어 값을 고른다 */
  pick: (text: LocalizedText) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const PLACEHOLDER = /\{(\w+)\}/g;

const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

export function I18nProvider({ children }: { children: ReactNode }) {
  // 서버 렌더와 첫 하이드레이션은 기본 언어(ko)로 맞추고, 사용자가 직접 고른 언어만 마운트 후 반영한다.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) setLocaleState(stored);
    } catch {
      // 저장소 접근이 막힌 환경에서는 기본 언어 유지
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const template = useCallback(
    (key: TranslationKey) => DICTIONARIES[locale][key] ?? DICTIONARIES[DEFAULT_LOCALE][key],
    [locale],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => {
      const text = template(key);
      if (!vars) return text;
      return text.replace(PLACEHOLDER, (match, name: string) => (name in vars ? String(vars[name]) : match));
    },
    [template],
  );

  const tRich = useCallback(
    (key: TranslationKey, nodes: NodeVars) =>
      // split 에 캡처 그룹을 쓰면 홀수 인덱스에 자리표시자 이름이 들어온다.
      template(key)
        .split(PLACEHOLDER)
        .map((part, i) => <Fragment key={i}>{i % 2 === 1 ? (nodes[part] ?? `{${part}}`) : part}</Fragment>),
    [template],
  );

  const pick = useCallback((text: LocalizedText) => text[locale] ?? text[DEFAULT_LOCALE], [locale]);

  const value = useMemo(
    () => ({ locale, intlLocale: INTL_LOCALES[locale], setLocale, t, tRich, pick }),
    [locale, setLocale, t, tRich, pick],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within <I18nProvider>");
  return ctx;
}

/** 서버 컴포넌트 안에서도 번역 문구를 끼워 넣을 수 있는 클라이언트 텍스트 노드 */
export function T({ k, vars }: { k: TranslationKey; vars?: Vars }) {
  const { t } = useTranslation();
  return <>{t(k, vars)}</>;
}

/** 서버 컴포넌트용 언어별 데이터 텍스트 */
export function L({ text }: { text: LocalizedText }) {
  const { pick } = useTranslation();
  return <>{pick(text)}</>;
}
