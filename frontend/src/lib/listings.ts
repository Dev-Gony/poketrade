import { cache } from "react";
import { DEMO_LISTINGS } from "@/data/demoListings";
import { serverApi, type ListingResponse, type ListingStatus, type PagedResponse } from "@/lib/api/backend";
import { toCardData, type CardData } from "@/lib/cards";
import { fetchPokemonTcgListings } from "@/lib/pokemonTcg";

/** 화면에 쓰는 매물. 가격·상태·판매자·카드 정보 모두 ListingResponse 에서 만든다. */
export type MarketListing = {
  listingId: number;
  status: ListingStatus;
  priceKrw: number;
  sellerNickname: string;
  /** 등록 시각(LocalDateTime 문자열). 최신 등록순 정렬에 사용 */
  createdAt: string;
  card: CardData;
};

/**
 * 데이터 출처.
 * - live: Spring 백엔드의 실제 거래 데이터
 * - tcg: 백엔드에 연결하지 못해 Pokémon TCG API 실제 카드 50장 + 자동 부여한 거래 속성으로 대체
 * - local: TCG API 마저 실패해 내장 데모 매물 8건으로 대체
 * live 가 아니면 '데모 모드' 이며, 결제는 브라우저 안에서만 시뮬레이션한다.
 */
export type DataSource = "live" | "tcg" | "local";

export const isDemoSource = (source: DataSource) => source !== "live";

const ALL_STATUSES: ListingStatus[] = ["ON_SALE", "RESERVED", "SOLD"];

export function toMarketListing(listing: ListingResponse): MarketListing {
  return {
    listingId: listing.listingId,
    status: listing.status,
    priceKrw: listing.price,
    sellerNickname: listing.sellerNickname,
    createdAt: listing.createdAt,
    card: toCardData(listing),
  };
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * 백엔드에 연결할 수 없을 때 쓸 데모 카탈로그.
 * Pokémon TCG API(1시간 캐시)를 우선 쓰고, 그마저 실패하면 내장 데모 데이터로 대체한다.
 */
const loadDemoCatalog = cache(async (): Promise<{ listings: ListingResponse[]; source: "tcg" | "local" }> => {
  try {
    return { listings: await fetchPokemonTcgListings(), source: "tcg" };
  } catch (error) {
    console.warn(`[PokeTrade] Pokémon TCG API 호출 실패 → 내장 데모 데이터로 대체합니다: ${reasonOf(error)}`);
    return { listings: DEMO_LISTINGS, source: "local" };
  }
});

/** 마켓플레이스 그리드. 백엔드 → Pokémon TCG API → 내장 데모 순으로 대체한다. */
export async function fetchMarketListings(): Promise<{ listings: MarketListing[]; source: DataSource }> {
  try {
    const page = await serverApi<PagedResponse<ListingResponse>>(`/listings?status=${ALL_STATUSES.join(",")}&size=100`);
    return { listings: page.content.map(toMarketListing), source: "live" };
  } catch (error) {
    console.warn(`[PokeTrade] 백엔드 호출 실패(GET /api/listings) → 데모 카탈로그로 대체합니다: ${reasonOf(error)}`);
    const demo = await loadDemoCatalog();
    return { listings: demo.listings.map(toMarketListing), source: demo.source };
  }
}

/**
 * 상세/결제: URL 슬러그(카드 code)로 매물 조회.
 * 백엔드 호출이 실패(연결 불가·404·5xx 등)하면 데모 카탈로그에서 같은 코드를 찾고, 그래도 없으면 내장 데모에서 찾는다.
 * generateMetadata 와 페이지가 같은 요청 안에서 함께 부르므로 React cache 로 한 번만 호출한다.
 */
export const fetchListingByCardCode = cache(async function fetchListingByCardCode(
  code: string,
): Promise<{ listing: MarketListing | null; source: DataSource }> {
  try {
    const listing = await serverApi<ListingResponse>(`/listings/by-card/${encodeURIComponent(code)}`);
    return { listing: toMarketListing(listing), source: "live" };
  } catch (error) {
    console.warn(`[PokeTrade] 백엔드 호출 실패(GET /api/listings/by-card/${code}) → 데모 카탈로그로 대체합니다: ${reasonOf(error)}`);
    const demo = await loadDemoCatalog();
    const found = demo.listings.find((l) => l.card.code === code);
    if (found) return { listing: toMarketListing(found), source: demo.source };
    const local = DEMO_LISTINGS.find((l) => l.card.code === code);
    return { listing: local ? toMarketListing(local) : null, source: "local" };
  }
});
