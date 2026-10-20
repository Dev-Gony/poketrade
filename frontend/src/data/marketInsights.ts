// 부가 시세 정보 (목업). 매물·카드 정보는 모두 백엔드(GET /api/listings)에서 오고,
// 여기에는 아직 백엔드 API 가 없는 시세·평판·피드 데이터만 둔다.
// TODO: 시세 API(30일 변동률·PSA 개체수), 판매자 평판 API, 실시간 체결 피드가 생기면 이 파일을 제거한다.

import type { LocalizedText, TranslationKey } from "@/i18n/dictionaries";
import { randomBetween, randomInt, seededRandom } from "@/lib/seeded";

export type CardInsights = {
  /** 30일 시세 변동률 (%) */
  change30dPct: number;
  /** 감정사 개체수 / 상위 등급 수 */
  population: number;
  higherGradedCount: number;
  /** 볼트 보관함 번호 */
  vaultBox: string;
  /** 판매자 평판 (닉네임은 백엔드 값 사용) */
  seller: { rating: string; trades: number; positivePct: string; avgResponseMinutes: number; memberSince: string };
};

/**
 * 고정값이 없는 카드(예: Pokémon TCG API 에서 가져온 카드)는 카드 코드 시드로 그럴듯한 값을 만든다.
 * 같은 카드는 항상 같은 값을 받는다.
 */
function generateInsights(code: string): CardInsights {
  const rng = seededRandom(`insights:${code}`);
  const population = randomInt(rng, 40, 6_000);
  return {
    change30dPct: Math.round(randomBetween(rng, -8, 16) * 10) / 10,
    population,
    higherGradedCount: rng() < 0.6 ? 0 : randomInt(rng, 1, Math.max(1, Math.floor(population / 3))),
    vaultBox: `SL-${String(randomInt(rng, 1, 1999)).padStart(4, "0")}`,
    seller: {
      rating: randomBetween(rng, 4.8, 5).toFixed(2).replace(/0$/, ""),
      trades: randomInt(rng, 12, 520),
      positivePct: randomBetween(rng, 98.5, 100).toFixed(1),
      avgResponseMinutes: randomInt(rng, 3, 45),
      memberSince: `${randomInt(rng, 2019, 2025)}-${String(randomInt(rng, 1, 12)).padStart(2, "0")}`,
    },
  };
}

/** 백엔드 Card.code 별 부가 정보 */
const CARD_INSIGHTS: Record<string, CardInsights> = {
  "charizard-vmax-074": {
    change30dPct: 8.6,
    population: 3_412,
    higherGradedCount: 0,
    vaultBox: "SL-0419",
    seller: { rating: "4.99", trades: 412, positivePct: "99.8", avgResponseMinutes: 10, memberSince: "2021-08" },
  },
  "umbreon-vmax-069": {
    change30dPct: 14.2,
    population: 1_240,
    higherGradedCount: 0,
    vaultBox: "V-402",
    seller: { rating: "5.0", trades: 428, positivePct: "100.0", avgResponseMinutes: 15, memberSince: "2022-03" },
  },
  "pikachu-illustrator-promo": {
    change30dPct: 2.1,
    population: 41,
    higherGradedCount: 1,
    vaultBox: "SL-0001",
    seller: { rating: "5.0", trades: 96, positivePct: "100.0", avgResponseMinutes: 5, memberSince: "2020-11" },
  },
  "gengar-vmax-alt": {
    change30dPct: -3.4,
    population: 2_876,
    higherGradedCount: 1_904,
    vaultBox: "SL-0388",
    seller: { rating: "4.98", trades: 240, positivePct: "99.6", avgResponseMinutes: 20, memberSince: "2022-07" },
  },
  "rayquaza-vmax-alt": {
    change30dPct: 6.8,
    population: 1_987,
    higherGradedCount: 0,
    vaultBox: "SL-0751",
    seller: { rating: "4.97", trades: 319, positivePct: "99.7", avgResponseMinutes: 12, memberSince: "2021-12" },
  },
  "mewtwo-vstar-sar": {
    change30dPct: -1.2,
    population: 312,
    higherGradedCount: 4,
    vaultBox: "SL-1203",
    seller: { rating: "4.95", trades: 87, positivePct: "99.1", avgResponseMinutes: 30, memberSince: "2023-02" },
  },
  "lillie-extra-battle": {
    change30dPct: 11.5,
    population: 82,
    higherGradedCount: 0,
    vaultBox: "SL-0077",
    seller: { rating: "5.0", trades: 96, positivePct: "100.0", avgResponseMinutes: 5, memberSince: "2020-11" },
  },
  "giratina-v-alt": {
    change30dPct: 4.3,
    population: 2_104,
    higherGradedCount: 0,
    vaultBox: "SL-0922",
    seller: { rating: "5.0", trades: 189, positivePct: "100.0", avgResponseMinutes: 18, memberSince: "2022-05" },
  },
};

export function getCardInsights(code: string): CardInsights {
  return CARD_INSIGHTS[code] ?? generateInsights(code);
}

// ---------------------------------------------------------------------------
// 헤더 실시간 거래 티커 (목업 피드)
// ---------------------------------------------------------------------------

export type TickerTrade = {
  name: LocalizedText;
  grade: string;
  actionKey: TranslationKey;
  /** 없으면 actionKey 문구만 tertiary 컬러로 강조 표시 */
  krw?: number;
};

export const LIVE_TRADES: TickerTrade[] = [
  { name: { ko: "리자몽 VMAX", en: "Charizard VMAX", ja: "リザードンVMAX" }, grade: "PSA 10", actionKey: "ticker.soldFor", krw: 3_450_000 },
  { name: { ko: "블래키 VMAX", en: "Umbreon VMAX", ja: "ブラッキーVMAX" }, grade: "PSA 10", actionKey: "ticker.soldFor", krw: 1_890_000 },
  { name: { ko: "피카츄 일러스트레이터", en: "Pikachu Illustrator", ja: "ポケモンイラストレーター" }, grade: "CGC 9.5", actionKey: "ticker.inquiryOpened" },
  { name: { ko: "팬텀 VMAX", en: "Gengar VMAX", ja: "ゲンガーVMAX" }, grade: "PSA 9", actionKey: "ticker.soldFor", krw: 620_000 },
  { name: { ko: "릴리에 엑스트라 배틀", en: "Lillie Extra Battle Day", ja: "リーリエ エクストラバトルの日" }, grade: "PSA 10", actionKey: "ticker.bidHit", krw: 12_100_000 },
  { name: { ko: "기라티나 V", en: "Giratina V", ja: "ギラティナV" }, grade: "PSA 10", actionKey: "ticker.soldFor", krw: 1_080_000 },
];
