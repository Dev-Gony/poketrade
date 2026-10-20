"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { MARKET_TOTAL_COUNT } from "@/data/marketInsights";
import { useTranslation } from "@/i18n/I18nProvider";
import type { MarketListing } from "@/lib/listings";
import { applyMarketQuery, DEFAULT_SORT, type SortId } from "@/lib/marketFilter";
import { isFullRange, priceBoundsOf, type PriceRange } from "@/lib/priceRange";
import CurrencyBadge from "./CurrencyBadge";
import FilterBar from "./FilterBar";
import ListingCard from "./ListingCard";
import MarketHero from "./MarketHero";

/**
 * 마켓플레이스 본문. 서버에서 받은 백엔드 매물 목록에 검색·필터·정렬을 클라이언트에서 즉시 적용한다.
 * (매물 수가 적어 전체를 한 번에 받는다. 매물이 많아지면 같은 조건을 백엔드 쿼리 파라미터로 넘기도록 바꾼다.)
 */
export default function MarketplaceView({ listings }: { listings: MarketListing[] }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedChips, setSelectedChips] = useState<ReadonlySet<string>>(() => new Set());
  const [sort, setSort] = useState<SortId>(DEFAULT_SORT);
  // 슬라이더 양 끝은 현재 백엔드 매물 가격 분포에서 정한다.
  const priceBounds = useMemo(() => priceBoundsOf(listings.map((l) => l.priceKrw)), [listings]);
  const [priceRange, setPriceRange] = useState<PriceRange | null>(priceBounds);
  const resultsRef = useRef<HTMLElement>(null);

  // 입력은 즉시 반영하고, 목록 계산은 입력을 막지 않도록 한 박자 늦게 따라간다.
  const deferredSearch = useDeferredValue(search);
  // 드래그 중에도 손잡이·금액 텍스트는 즉시 움직이고, 목록 재계산만 뒤따라가게 한다.
  const deferredPrice = useDeferredValue(priceRange);
  const priceFilterActive = !!(priceBounds && deferredPrice && !isFullRange(deferredPrice, priceBounds));
  const visible = useMemo(
    () =>
      applyMarketQuery(listings, {
        search: deferredSearch,
        chips: selectedChips,
        sort,
        price: priceFilterActive ? deferredPrice : null,
      }),
    [listings, deferredSearch, selectedChips, sort, priceFilterActive, deferredPrice],
  );

  const toggleChip = useCallback((chipId: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(chipId)) next.delete(chipId);
      else next.add(chipId);
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSelectedChips(new Set());
    setPriceRange(priceBounds);
  }, [priceBounds]);

  const resetAll = useCallback(() => {
    setSearch("");
    resetFilters();
  }, [resetFilters]);

  const filtersActive = selectedChips.size > 0 || !!(priceBounds && priceRange && !isFullRange(priceRange, priceBounds));

  const scrollToResults = useCallback(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), []);

  return (
    <div className="flex flex-col w-full">
      {/* Top Atmosphere / Cosmic Halo */}
      <div className="relative w-full overflow-hidden bg-surface-container-lowest">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-primary-container/25 via-tertiary-container/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-12 right-12 w-64 h-64 bg-secondary/5 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-margin pt-8 pb-12 w-full flex flex-col gap-space-lg">
          <MarketHero onSearchChange={setSearch} onSubmit={scrollToResults} search={search} />
          <FilterBar
            onReset={resetFilters}
            onSortChange={setSort}
            filtersActive={filtersActive}
            onPriceChange={setPriceRange}
            onToggleChip={toggleChip}
            priceBounds={priceBounds}
            priceRange={priceRange}
            resultCount={visible.length}
            selectedChips={selectedChips}
            sort={sort}
          />
        </div>
      </div>

      {/* Main Marketplace Listings Section */}
      <section ref={resultsRef} className="max-w-7xl mx-auto px-margin py-8 w-full flex flex-col gap-space-lg scroll-mt-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">{t("market.sectionTitle")}</h2>
              <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-label-caps text-label-caps bg-tertiary-container/30 text-tertiary font-bold">
                {t("market.liveBadge")}
              </span>
            </div>
            <p className="font-body-md text-body-md text-outline">{t("market.sectionSubtitle")}</p>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <span className="font-label-numeric-sm text-label-numeric-sm text-outline">{t("market.settlementCurrency")}</span>
            <CurrencyBadge />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState onReset={resetAll} />
        ) : (
          <>
            {/* 2-Column Expansive Grail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              {visible.map((listing) => (
                <ListingCard key={listing.listingId} listing={listing} />
              ))}
            </div>

            {/* Load-more Footer */}
            <div className="flex flex-col items-center justify-center gap-space-sm py-12">
              <span className="font-label-numeric-md text-label-numeric-md text-on-surface font-semibold">
                {t("market.showing", { shown: visible.length, total: MARKET_TOTAL_COUNT.toLocaleString("en-US") })}
              </span>
              <p className="font-body-sm text-body-sm text-outline">{t("market.scrollHint")}</p>
              <button
                className="mt-2 px-6 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-md text-body-md transition-all shadow-sm"
                type="button"
              >
                {t("market.loadMore")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center gap-space-sm py-20 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/60" role="status">
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-1">
        <span className="material-symbols-outlined text-[34px] text-outline">search_off</span>
      </div>
      <p className="font-headline-sm text-headline-sm text-on-surface font-bold">{t("empty.title")}</p>
      <p className="font-body-md text-body-md text-outline max-w-sm">{t("empty.body")}</p>
      <button
        className="mt-space-sm px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-bold flex items-center gap-1.5 hover:brightness-110 transition-all"
        onClick={onReset}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
        {t("empty.reset")}
      </button>
    </div>
  );
}
