// 백엔드 매물 응답(GET /api/listings)을 화면용 카드 모델로 변환한다.
// 카드명·세트·등급·속성·이미지 등 카드 정보는 모두 백엔드(H2) 데이터가 원천이다.
// 아직 백엔드 API 가 없는 부가 시세 정보만 data/marketInsights.ts 에서 보충한다.

import { getCardInsights } from "@/data/marketInsights";
import type { LocalizedText, TranslationKey } from "@/i18n/dictionaries";
import type { BackendCardRarity, BackendEnergyType, ListingResponse } from "@/lib/api/backend";

export type { LocalizedText };

/** RAW = 감정되지 않은 카드 */
export type GradeCompany = "PSA" | "BGS" | "CGC" | "RAW";

export type EnergyType = Lowercase<BackendEnergyType>;

/** 레어도 필터용 태그 (백엔드 rarity·printLanguage 에서 파생) */
export type RarityTag = "holo" | "secret" | "sar" | "jpPromo";

export type CardData = {
  /** 백엔드 Card.code (= URL 슬러그) */
  id: string;
  name: LocalizedText;
  /** 슬랩 라벨 인쇄용 영문명 */
  slabName: string;
  setName: string;
  year: number | null;
  cardNumber: string;
  rarity: string;
  /** 카드 분류 (예: Pokémon VMAX / Fire) */
  classification: string;
  energyType: EnergyType | null;
  rarityTags: RarityTag[];
  printLanguage: string;
  grade: { company: GradeCompany; score: string; label: string };
  certNumber: string;
  imageUrl: string;
  // ↓ 부가 시세 정보 (marketInsights)
  change30dPct: number;
  population: number;
  higherGradedCount: number;
  vaultBox: string;
  seller: {
    name: string;
    initials: string;
    rating: string;
    trades: number;
    positivePct: string;
    avgResponseMinutes: number;
    memberSince: string;
  };
};

const RARITY_LABELS: Record<BackendCardRarity, string> = {
  C: "Common",
  U: "Uncommon",
  R: "Rare",
  RR: "Double Rare",
  SR: "Super Rare",
  SAR: "Special Art Rare",
  UR: "Secret Rare",
  PROMO: "Promo",
};

const ENERGY_LABELS: Record<BackendEnergyType, string> = {
  FIRE: "Fire",
  WATER: "Water",
  LIGHTNING: "Lightning",
  GRASS: "Grass",
  PSYCHIC: "Psychic",
  FIGHTING: "Fighting",
  DARKNESS: "Darkness",
  METAL: "Metal",
  DRAGON: "Dragon",
  COLORLESS: "Colorless",
  TRAINER: "Trainer",
};

/** 감정 등급 라벨 (슬랩 표기 관례) */
function gradeLabel(company: GradeCompany, score: string) {
  const value = Number(score);
  if (company === "PSA") return value === 10 ? "GEM MT" : value >= 9 ? "MINT" : "NM-MT";
  if (company === "BGS") return value === 10 ? "PRISTINE" : value >= 9.5 ? "GEM MINT" : "MINT";
  if (company === "CGC") return value === 10 ? "GEM MINT" : value >= 9.5 ? "MINT+" : "MINT";
  return "UNGRADED";
}

/** 레어도 필터 태그. UR = 시크릿 레어, SAR = 스페셜 아트 레어, RR 이상은 홀로, 일본판 프로모는 jpPromo */
function deriveRarityTags(rarity: BackendCardRarity, printLanguage: string): RarityTag[] {
  const tags: RarityTag[] = [];
  if (["RR", "SR", "SAR", "UR"].includes(rarity)) tags.push("holo");
  if (rarity === "UR") tags.push("secret");
  if (rarity === "SAR") tags.push("sar");
  if (rarity === "PROMO" && printLanguage === "ja") tags.push("jpPromo");
  return tags;
}

const initialsOf = (nickname: string) =>
  nickname
    .split(/[_\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

const PLACEHOLDER_IMAGE = "https://images.pokemontcg.io/swsh1/back.png";

export function toCardData(listing: ListingResponse): CardData {
  const { card, grade } = listing;
  const code = card.code ?? `listing-${listing.listingId}`;
  const nameEn = card.nameEn ?? card.name;
  const printLanguage = card.printLanguage ?? "en";
  const company: GradeCompany = grade?.company ?? "RAW";
  const score = grade?.score ?? "-";
  const insights = getCardInsights(code);
  const energyLabel = card.energyType ? ENERGY_LABELS[card.energyType] : null;
  const category = card.category ?? "Pokémon";

  return {
    id: code,
    name: { ko: card.name, en: nameEn, ja: card.nameJa ?? nameEn },
    slabName: nameEn.toUpperCase(),
    setName: card.setName,
    year: card.releaseYear,
    cardNumber: card.cardNumber,
    rarity: RARITY_LABELS[card.rarity] ?? card.rarity,
    classification: energyLabel && card.energyType !== "TRAINER" ? `${category} / ${energyLabel}` : category,
    energyType: card.energyType ? (card.energyType.toLowerCase() as EnergyType) : null,
    rarityTags: deriveRarityTags(card.rarity, printLanguage),
    printLanguage,
    grade: { company, score, label: gradeLabel(company, score) },
    certNumber: grade?.certNumber ?? "-",
    imageUrl: card.imageUrl ?? PLACEHOLDER_IMAGE,
    change30dPct: insights.change30dPct,
    population: insights.population,
    higherGradedCount: insights.higherGradedCount,
    vaultBox: insights.vaultBox,
    seller: { ...insights.seller, name: listing.sellerNickname, initials: initialsOf(listing.sellerNickname) },
  };
}

/** 등급사별 라벨 색상 (Tailwind 가 스캔할 수 있도록 완성된 클래스 문자열) */
export const GRADE_STYLES: Record<GradeCompany, { plate: string; badge: string; meta: string; text: string }> = {
  PSA: { plate: "bg-error/15 text-error", badge: "text-error bg-error/10", meta: "text-error/80", text: "text-error" },
  BGS: { plate: "bg-secondary/15 text-secondary", badge: "text-secondary bg-secondary/15", meta: "text-secondary/80", text: "text-secondary" },
  CGC: { plate: "bg-tertiary/15 text-tertiary", badge: "text-tertiary bg-tertiary/15", meta: "text-tertiary/80", text: "text-tertiary" },
  RAW: { plate: "bg-surface-container-high text-on-surface-variant", badge: "text-on-surface-variant bg-surface-container-high", meta: "text-outline", text: "text-on-surface-variant" },
};

export const gradeText = (card: CardData) => (card.grade.company === "RAW" ? "RAW" : `${card.grade.company} ${card.grade.score}`);

export const formatChangePct = (pct: number) => `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;

// ---------------------------------------------------------------------------
// 시세 파생 데이터 (부가 정보). 실제로는 시세 API 에서 받아온다.
// ---------------------------------------------------------------------------

const roundTo10k = (value: number) => Math.round(value / 10_000) * 10_000;

export type ComparableSale = {
  /** Intl.RelativeTimeFormat 으로 언어별 표기 */
  ago: { value: number; unit: "day" | "week" };
  venueKey: TranslationKey;
  venueTone: "tertiary" | "muted";
  dotTone: "secondary" | "muted";
  krw: number;
};

export type MarketStats = {
  /** 비교 거래 행에 표시할 등급 (예: PSA 10) */
  gradeLabel: string;
  change30dPct: number;
  volumeKrw: number;
  low12mKrw: number;
  allTimeHighKrw: number;
  latestSettlementKrw: number;
  topOfferKrw: number;
  /** X축 월 라벨 (YYYY-MM). 마지막 항목이 오늘 */
  axisMonths: string[];
  comparableSales: ComparableSale[];
};

/** price 는 백엔드 매물 가격(KRW) */
export function getMarketStats(card: CardData, price: number): MarketStats {
  return {
    gradeLabel: gradeText(card),
    change30dPct: card.change30dPct,
    volumeKrw: roundTo10k(price * 25),
    low12mKrw: roundTo10k(price * 0.65),
    allTimeHighKrw: roundTo10k(price * 1.09),
    latestSettlementKrw: price,
    topOfferKrw: roundTo10k(price * 0.94),
    axisMonths: ["2023-05", "2023-08", "2023-11", "2024-02", "2024-05"],
    comparableSales: [
      { ago: { value: 2, unit: "day" }, venueKey: "venue.seoulVault", venueTone: "tertiary", dotTone: "secondary", krw: roundTo10k(price * 0.985) },
      { ago: { value: 1, unit: "week" }, venueKey: "venue.global", venueTone: "muted", dotTone: "muted", krw: roundTo10k(price * 1.015) },
    ],
  };
}
