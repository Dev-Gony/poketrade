import { en, type Dictionary, type TranslationKey } from "./locales/en";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";

export type { TranslationKey };

export const LOCALES = ["ko", "en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

/** 언어별 원문을 갖는 데이터(카드명 등) */
export type LocalizedText = Record<Locale, string>;

export const DEFAULT_LOCALE: Locale = "ko";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
};

export const LOCALE_NAMES: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

/** Intl API(숫자·날짜·상대시간 포맷)에 넘길 BCP 47 태그 */
export const INTL_LOCALES: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

export const DICTIONARIES: Record<Locale, Dictionary> = { ko, en, ja };
