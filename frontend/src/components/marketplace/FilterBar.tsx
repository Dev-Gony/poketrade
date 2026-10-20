"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n/I18nProvider";
import { FILTER_CHIPS, SORT_OPTIONS, type SortId } from "@/lib/marketFilter";
import type { PriceRange } from "@/lib/priceRange";
import PriceRangeSlider from "./PriceRangeSlider";

type ViewMode = "grid" | "list";

const CHIP_BASE = "shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full font-label-caps text-label-caps flex items-center gap-1 transition-colors";
const CHIP_ACTIVE = `${CHIP_BASE} bg-primary-container text-on-primary-container font-bold shadow-[0_0_12px_rgba(160,120,255,0.4)]`;

type FilterBarProps = {
  /** 선택된 칩 ID. 비어 있으면 "전체" */
  selectedChips: ReadonlySet<string>;
  onToggleChip: (chipId: string) => void;
  onReset: () => void;
  sort: SortId;
  onSortChange: (sort: SortId) => void;
  /** 슬라이더 양 끝 (매물 가격에서 계산). 매물이 없으면 null */
  priceBounds: PriceRange | null;
  priceRange: PriceRange | null;
  onPriceChange: (range: PriceRange) => void;
  /** 칩·가격 중 하나라도 걸려 있으면 [필터 초기화] 활성 */
  filtersActive: boolean;
  /** 현재 검색·필터 결과 건수 */
  resultCount: number;
};

/** 검색·필터·정렬 상태는 MarketplaceView 가 소유하고, 이 컴포넌트는 표시와 이벤트 전달만 한다. */
export default function FilterBar({
  selectedChips,
  onToggleChip,
  onReset,
  sort,
  onSortChange,
  priceBounds,
  priceRange,
  onPriceChange,
  filtersActive,
  resultCount,
}: FilterBarProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewMode>("grid");
  const allActive = selectedChips.size === 0;

  return (
    <>
      {/* Rarity & Type Filter Matrix */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{t("filter.title")}</span>
          <button
            className="text-tertiary font-label-numeric-sm text-label-numeric-sm cursor-pointer hover:underline disabled:text-outline disabled:no-underline disabled:cursor-default"
            disabled={!filtersActive}
            onClick={onReset}
            type="button"
          >
            {t("filter.reset")}
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label={t("filter.title")}>
          <button aria-pressed={allActive} className={allActive ? CHIP_ACTIVE : `${CHIP_BASE} bg-surface-container-high text-on-surface hover:bg-surface-container-highest`} onClick={onReset} type="button">
            {t("filter.all")}
          </button>
          {FILTER_CHIPS.map((chip) => {
            const active = selectedChips.has(chip.id);
            return (
              <button
                key={chip.id}
                aria-pressed={active}
                className={active ? CHIP_ACTIVE : `${CHIP_BASE} bg-surface-container-high hover:bg-surface-container-highest ${chip.inactiveClass}`}
                onClick={() => onToggleChip(chip.id)}
                type="button"
              >
                {chip.dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-on-primary-container" : chip.dot}`} />}
                {chip.emoji && <span aria-hidden>{chip.emoji}</span>}
                {t(chip.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Controls: Sorting, View Switcher, Price Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md p-space-md rounded-xl bg-surface-container-low shadow-md items-center">
        <div className="lg:col-span-4 flex items-center gap-2">
          <span className="font-label-caps text-label-caps text-outline uppercase shrink-0">{t("filter.sortBy")}</span>
          <div className="relative w-full">
            <select
              aria-label={t("filter.sortLabel")}
              className="w-full appearance-none bg-surface-container px-3 py-2 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none cursor-pointer pr-8"
              onChange={(e) => onSortChange(e.target.value as SortId)}
              value={sort}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>

        <div className="lg:col-span-5">
          {priceBounds && priceRange && <PriceRangeSlider bounds={priceBounds} onChange={onPriceChange} value={priceRange} />}
        </div>

        <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-space-md">
          <span aria-live="polite" className="font-label-numeric-sm text-label-numeric-sm text-tertiary flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full animate-pulse ${resultCount === 0 ? "bg-outline" : "bg-tertiary"}`} />
            {t("filter.onDeck", { count: resultCount })}
          </span>
          <div className="flex items-center p-1 bg-surface-container rounded-lg">
            <ViewButton active={view === "grid"} icon="grid_view" onClick={() => setView("grid")} title={t("filter.viewGrid")} />
            <ViewButton active={view === "list"} icon="view_agenda" onClick={() => setView("list")} title={t("filter.viewList")} />
          </div>
        </div>
      </div>
    </>
  );
}

function ViewButton({ active, icon, title, onClick }: { active: boolean; icon: string; title: string; onClick: () => void }) {
  return (
    <button
      aria-label={title}
      aria-pressed={active}
      className={active ? "p-1.5 rounded bg-surface-container-high text-primary" : "p-1.5 rounded text-outline hover:text-on-surface transition-colors"}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
