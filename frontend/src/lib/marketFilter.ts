// 마켓플레이스 검색·필터·정렬 순수 로직. 상태는 MarketplaceView 가 들고, 화면 컴포넌트는 결과만 그린다.

import type { TranslationKey } from "@/i18n/dictionaries";
import { parseServerDateTime } from "@/lib/api/backend";
import type { CardData, EnergyType, RarityTag } from "@/lib/cards";
import type { MarketListing } from "@/lib/listings";
import type { PriceRange } from "@/lib/priceRange";

/** 같은 그룹 안의 칩은 OR, 서로 다른 그룹끼리는 AND 로 결합한다. (예: 불꽃 또는 번개 AND PSA 10) */
export type FilterGroup = "type" | "grade" | "rarity";

export type FilterChip = {
  id: string;
  group: FilterGroup;
  labelKey: TranslationKey;
  emoji?: string;
  inactiveClass: string;
  dot?: string;
  matches: (card: CardData) => boolean;
};

const byType = (type: EnergyType) => (card: CardData) => card.energyType === type;
const byTag = (tag: RarityTag) => (card: CardData) => card.rarityTags.includes(tag);

export const FILTER_CHIPS: FilterChip[] = [
  { id: "fire", group: "type", labelKey: "filter.fire", emoji: "🔥", inactiveClass: "text-on-surface", matches: byType("fire") },
  { id: "water", group: "type", labelKey: "filter.water", emoji: "💧", inactiveClass: "text-on-surface", matches: byType("water") },
  { id: "lightning", group: "type", labelKey: "filter.lightning", emoji: "⚡", inactiveClass: "text-on-surface", matches: byType("lightning") },
  { id: "grass", group: "type", labelKey: "filter.grass", emoji: "🌿", inactiveClass: "text-on-surface", matches: byType("grass") },
  { id: "holo", group: "rarity", labelKey: "filter.holo", emoji: "✨", inactiveClass: "text-on-surface", matches: byTag("holo") },
  {
    id: "psa10",
    group: "grade",
    labelKey: "filter.psa10",
    inactiveClass: "text-error font-semibold",
    dot: "bg-error",
    matches: (card) => card.grade.company === "PSA" && Number(card.grade.score) === 10,
  },
  {
    id: "bgs95",
    group: "grade",
    labelKey: "filter.bgs95",
    inactiveClass: "text-secondary font-semibold",
    dot: "bg-secondary",
    matches: (card) => card.grade.company === "BGS" && Number(card.grade.score) >= 9.5,
  },
  { id: "secret", group: "rarity", labelKey: "filter.secret", emoji: "👑", inactiveClass: "text-tertiary", matches: byTag("secret") },
  { id: "sar", group: "rarity", labelKey: "filter.sar", emoji: "⭐", inactiveClass: "text-on-surface", matches: byTag("sar") },
  { id: "jp-promo", group: "rarity", labelKey: "filter.jpPromo", emoji: "🍿", inactiveClass: "text-on-surface", matches: byTag("jpPromo") },
];

const CHIPS_BY_ID = new Map(FILTER_CHIPS.map((chip) => [chip.id, chip]));

export const SORT_OPTIONS = [
  { id: "price-desc", labelKey: "sort.priceDesc" },
  { id: "price-asc", labelKey: "sort.priceAsc" },
  { id: "latest", labelKey: "sort.latest" },
] as const satisfies readonly { id: string; labelKey: TranslationKey }[];

export type SortId = (typeof SORT_OPTIONS)[number]["id"];
export const DEFAULT_SORT: SortId = "price-desc";

const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase().replace(/\s+/g, " ").trim();

/** 한글명·영문명(·일본어명)·세트명에 검색어가 포함되는지 */
export function matchesQuery(card: CardData, query: string) {
  const needle = normalize(query);
  if (!needle) return true;
  return [card.name.ko, card.name.en, card.name.ja, card.setName].some((text) => normalize(text).includes(needle));
}

export function matchesChips(card: CardData, selectedChipIds: ReadonlySet<string>) {
  if (selectedChipIds.size === 0) return true;
  const groups = new Map<FilterGroup, FilterChip[]>();
  selectedChipIds.forEach((id) => {
    const chip = CHIPS_BY_ID.get(id);
    if (chip) groups.set(chip.group, [...(groups.get(chip.group) ?? []), chip]);
  });
  return Array.from(groups.values()).every((chips) => chips.some((chip) => chip.matches(card)));
}

const createdAtMs = (listing: MarketListing) => parseServerDateTime(listing.createdAt).getTime();

const COMPARATORS: Record<SortId, (a: MarketListing, b: MarketListing) => number> = {
  "price-desc": (a, b) => b.priceKrw - a.priceKrw,
  "price-asc": (a, b) => a.priceKrw - b.priceKrw,
  // 같은 시각에 등록된 시드 데이터는 매물 ID 가 큰 쪽(나중 등록)을 앞에 둔다.
  latest: (a, b) => createdAtMs(b) - createdAtMs(a) || b.listingId - a.listingId,
};

export type MarketQuery = {
  search: string;
  chips: ReadonlySet<string>;
  sort: SortId;
  /** null 이면 가격 제한 없음 */
  price: PriceRange | null;
};

export const matchesPrice = (priceKrw: number, range: PriceRange | null) => !range || (priceKrw >= range.min && priceKrw <= range.max);

export function applyMarketQuery(listings: readonly MarketListing[], { search, chips, sort, price }: MarketQuery) {
  return listings
    .filter(
      (listing) =>
        matchesQuery(listing.card, search) && matchesChips(listing.card, chips) && matchesPrice(listing.priceKrw, price),
    )
    .sort(COMPARATORS[sort]);
}
