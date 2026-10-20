"use client";

import { useEffect, useRef } from "react";
import { useCurrency } from "@/currency/CurrencyProvider";
import { useTranslation } from "@/i18n/I18nProvider";

const VOLUME_24H_KRW = 4_800_000_000;

type MarketHeroProps = {
  /** 실시간 검색어 (MarketplaceView 가 소유) */
  search: string;
  onSearchChange: (value: string) => void;
  /** Enter / [볼트 검색] 시 결과 영역으로 이동 */
  onSubmit: () => void;
};

export default function MarketHero({ search, onSearchChange, onSubmit }: MarketHeroProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();

  const marketStats = [
    { labelKey: "hero.vol24h", value: `${format(VOLUME_24H_KRW, { compact: true })}+`, valueClass: "text-secondary" },
    { labelKey: "hero.escrowSuccess", value: "99.98%", valueClass: "text-tertiary" },
    { labelKey: "hero.counterfeitRate", value: t("hero.zeroRisk"), valueClass: "text-primary" },
  ] as const;
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K 로 검색창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Market Pulse & Trust Bar */}
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-caps text-label-caps tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            {t("hero.vaultBadge")}
          </span>
          <span className="text-outline font-label-numeric-sm text-label-numeric-sm">{t("hero.custody")}</span>
        </div>
        <div className="flex items-center gap-space-xs flex-wrap">
          {marketStats.map((stat) => (
            <div key={stat.labelKey} className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low shadow-sm">
              <span className="font-label-numeric-sm text-label-numeric-sm text-outline">{t(stat.labelKey)}</span>
              <span className={`font-label-numeric-sm text-label-numeric-sm font-semibold ${stat.valueClass}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Headline & Value Prop */}
      <div className="flex flex-col gap-space-xs mt-2">
        <div className="flex items-center gap-2 text-primary font-label-caps text-label-caps uppercase tracking-wider">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          {t("hero.eyebrow")}
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-extrabold max-w-4xl">
          {t("hero.title")}
        </h1>
        <p className="font-body-md text-body-md text-outline max-w-2xl">
          {t("hero.subtitle")}
        </p>
      </div>

      {/* Hero Search Input Terminal */}
      <form
        className="relative w-full mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        role="search"
      >
        <div className="relative flex items-center bg-surface-container-high rounded-xl shadow-xl transition-all focus-within:shadow-[0_0_24px_rgba(160,120,255,0.25)]">
          <div className="pl-space-md text-on-surface-variant flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[24px]">search</span>
          </div>
          <input
            ref={searchRef}
            aria-label={t("hero.searchLabel")}
            className="w-full bg-transparent py-4 px-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && search) {
                e.preventDefault();
                onSearchChange("");
              }
            }}
            placeholder={t("hero.searchPlaceholder")}
            type="search"
            value={search}
          />
          <div className="pr-space-md flex items-center gap-2">
            {search && (
              <button
                aria-label={t("hero.clearSearch")}
                className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                onClick={() => {
                  onSearchChange("");
                  searchRef.current?.focus();
                }}
                title={t("hero.clearSearch")}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container font-label-numeric-sm text-label-numeric-sm text-outline">
              <span className="text-[10px]">⌘</span>K
            </span>
            <button
              className="px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-body-md font-bold hover:brightness-110 active:scale-95 transition-all shadow-md whitespace-nowrap"
              type="submit"
            >
              {t("hero.inspect")}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
