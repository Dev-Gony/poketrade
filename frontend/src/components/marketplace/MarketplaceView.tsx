"use client";

import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
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
/** 처음에, 그리고 [더 보기]마다 렌더링하는 매물 수. 1·2·3·4열 모두 줄이 딱 맞게 떨어지는 12 */
const PAGE_SIZE = 12;

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

  // 검색·필터·정렬·가격 조건이 바뀌면 다시 첫 페이지(12건)부터 보여 준다.
  // useEffect 로 리셋하면 한 번은 이전 개수로 그려지므로, 조건 키가 바뀌었는지로 바로 판단한다.
  const queryKey = JSON.stringify([
    deferredSearch,
    Array.from(selectedChips).sort(),
    sort,
    priceFilterActive && deferredPrice ? [deferredPrice.min, deferredPrice.max] : null,
  ]);
  const [paging, setPaging] = useState({ key: queryKey, count: PAGE_SIZE });
  const shownCount = Math.min(paging.key === queryKey ? paging.count : PAGE_SIZE, visible.length);
  const shown = visible.slice(0, shownCount);
  const hasMore = shownCount < visible.length;
  const loadMore = () => setPaging({ key: queryKey, count: shownCount + PAGE_SIZE });

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
            {/* 반응형 그리드: 모바일 1열 · 태블릿 2열 · 노트북 3열 · 데스크톱 4열 */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((listing) => (
                <ListingCard key={listing.listingId} listing={listing} />
              ))}
            </div>

            {/* Load-more Footer */}
            <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-8">
              <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-container-high" aria-hidden>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width] duration-300"
                  style={{ width: `${(shownCount / visible.length) * 100}%` }}
                />
              </div>
              <span aria-live="polite" className="font-label-numeric-sm text-label-numeric-sm text-outline">
                {t("market.showing", { shown: shownCount, total: visible.length })}
              </span>
              {hasMore ? (
                <button
                  className="mt-1 flex items-center gap-1.5 rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 py-2.5 font-body-md text-body-md font-semibold text-on-surface shadow-sm transition-all hover:border-primary/50 hover:bg-surface-container-highest active:scale-[0.98]"
                  onClick={loadMore}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                  {t("market.loadMoreCount", { shown: shownCount, total: visible.length })}
                </button>
              ) : (
                <span className="flex items-center gap-1 font-body-sm text-body-sm text-outline">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                  {t("market.allShown")}
                </span>
              )}
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
