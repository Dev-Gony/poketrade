"use client";

import { useCurrency } from "@/currency/CurrencyProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import { priceToStep, SLIDER_STEPS, stepToPrice, type PriceRange } from "@/lib/priceRange";

/** 두 손잡이가 겹치지 않도록 유지할 최소 간격 (눈금) */
const MIN_GAP_STEPS = 10;

type PriceRangeSliderProps = {
  bounds: PriceRange;
  value: PriceRange;
  onChange: (range: PriceRange) => void;
};

/**
 * HTML5 range 입력 두 개를 겹쳐 만든 최소/최대 가격 슬라이더.
 * 트랙은 클릭을 통과시키고 손잡이만 드래그를 받는다(globals.css 의 .dual-range).
 * 키보드(←/→, Home/End)로도 각각 조작할 수 있다.
 */
export default function PriceRangeSlider({ bounds, value, onChange }: PriceRangeSliderProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const disabled = bounds.max <= bounds.min;

  const minStep = priceToStep(value.min, bounds);
  const maxStep = priceToStep(value.max, bounds);
  const atUpperBound = value.max >= bounds.max;

  const setMinStep = (step: number) => {
    const next = Math.min(step, maxStep - MIN_GAP_STEPS);
    onChange({ min: stepToPrice(Math.max(0, next), bounds), max: value.max });
  };

  const setMaxStep = (step: number) => {
    const next = Math.max(step, minStep + MIN_GAP_STEPS);
    onChange({ min: value.min, max: stepToPrice(Math.min(SLIDER_STEPS, next), bounds) });
  };

  const left = (minStep / SLIDER_STEPS) * 100;
  const right = 100 - (maxStep / SLIDER_STEPS) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-outline font-label-numeric-sm text-label-numeric-sm">
        <span>{t("filter.priceIndex")}</span>
        <span aria-live="polite" className="text-on-surface font-semibold">
          {format(value.min)} — {format(value.max)}
          {atUpperBound ? "+" : ""}
        </span>
      </div>
      <div className={`dual-range relative w-full h-5 ${disabled ? "opacity-50" : ""}`}>
        {/* 트랙 + 선택 구간 */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-surface-container" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-primary to-secondary"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <input
          aria-label={t("filter.priceMin")}
          aria-valuetext={format(value.min)}
          className="dual-range-input dual-range-min"
          disabled={disabled}
          max={SLIDER_STEPS}
          min={0}
          onChange={(e) => setMinStep(Number(e.target.value))}
          step={1}
          // 두 손잡이가 오른쪽 끝에서 겹치면 최소 손잡이를 위로 올려 다시 잡을 수 있게 한다.
          style={{ zIndex: minStep > SLIDER_STEPS * 0.9 ? 4 : 3 }}
          type="range"
          value={minStep}
        />
        <input
          aria-label={t("filter.priceMax")}
          aria-valuetext={`${format(value.max)}${atUpperBound ? "+" : ""}`}
          className="dual-range-input dual-range-max"
          disabled={disabled}
          max={SLIDER_STEPS}
          min={0}
          onChange={(e) => setMaxStep(Number(e.target.value))}
          step={1}
          style={{ zIndex: 3 }}
          type="range"
          value={maxStep}
        />
      </div>
    </div>
  );
}
