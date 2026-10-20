// 문자열 시드 기반 결정적 난수. 같은 카드에는 항상 같은 시세·등급·판매자가 붙도록 한다.
// (새로고침마다 값이 바뀌면 캐시·정렬·상세 화면이 서로 어긋난다.)

/** FNV-1a 32bit 해시 */
export function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: 시드를 받아 [0, 1) 난수를 차례로 돌려주는 생성기 */
export function seededRandom(seed: string) {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof seededRandom>;

export const randomBetween = (rng: Rng, min: number, max: number) => min + (max - min) * rng();

export const randomInt = (rng: Rng, min: number, max: number) => Math.floor(randomBetween(rng, min, max + 1));

export const pick = <T>(rng: Rng, items: readonly T[]) => items[Math.floor(rng() * items.length)];

/** [값, 가중치] 목록에서 가중치 비율로 하나를 고른다 */
export function weightedPick<T>(rng: Rng, entries: readonly (readonly [T, number])[]) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}

export const randomDigits = (rng: Rng, length: number) => Array.from({ length }, () => Math.floor(rng() * 10)).join("");
