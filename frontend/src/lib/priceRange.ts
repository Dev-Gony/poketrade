// 가격 범위 슬라이더 계산. 매물 가격이 수십만~수천만 원으로 넓게 퍼져 있어 로그 스케일로 매핑한다.
// (선형이면 저가 카드가 슬라이더 왼쪽 몇 픽셀에 몰려 조작하기 어렵다.)

export type PriceRange = { min: number; max: number };

/** 슬라이더 내부 눈금 수 (input[type=range] 의 0~STEPS) */
export const SLIDER_STEPS = 1000;

const magnitude = (value: number) => 10 ** Math.floor(Math.log10(value));

/** 1·2·5 단위로 내림 (예: 480,000 → 200,000 이 아니라 400,000 처럼 첫 자리 기준) */
function niceFloor(value: number) {
  const m = magnitude(value);
  return Math.floor(value / m) * m;
}

/** 1·2·5 단위로 올림 (예: 45,000,000 → 50,000,000) */
function niceCeil(value: number) {
  const m = magnitude(value);
  const steps = [1, 2, 5, 10];
  return (steps.find((s) => s * m >= value) ?? 10) * m;
}

/** 두 자리 유효숫자로 반올림해 사람이 읽기 좋은 금액으로 맞춘다 (예: 1,234,567 → 1,200,000) */
function roundSignificant(value: number) {
  const m = magnitude(value) / 10;
  return Math.round(value / m) * m;
}

/** 매물 가격들로 슬라이더 양 끝 값을 정한다. 매물이 없으면 null */
export function priceBoundsOf(prices: number[]): PriceRange | null {
  const positive = prices.filter((p) => p > 0);
  if (positive.length === 0) return null;
  return { min: niceFloor(Math.min(...positive)), max: niceCeil(Math.max(...positive)) };
}

export function priceToStep(price: number, bounds: PriceRange) {
  if (bounds.max <= bounds.min) return 0;
  const ratio = Math.log(price / bounds.min) / Math.log(bounds.max / bounds.min);
  return Math.round(Math.min(1, Math.max(0, ratio)) * SLIDER_STEPS);
}

export function stepToPrice(step: number, bounds: PriceRange) {
  if (step <= 0) return bounds.min;
  if (step >= SLIDER_STEPS) return bounds.max;
  const raw = bounds.min * (bounds.max / bounds.min) ** (step / SLIDER_STEPS);
  return Math.min(bounds.max, Math.max(bounds.min, roundSignificant(raw)));
}

/** 범위가 전체 구간과 같으면 가격 필터가 걸리지 않은 상태 */
export const isFullRange = (range: PriceRange, bounds: PriceRange) => range.min <= bounds.min && range.max >= bounds.max;
