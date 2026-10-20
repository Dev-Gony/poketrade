import { cache } from "react";
import { DEMO_LISTINGS } from "@/data/demoListings";
import { serverApi, type ListingResponse, type ListingStatus, type PagedResponse } from "@/lib/api/backend";
import { toCardData, type CardData } from "@/lib/cards";

/** 화면에 쓰는 매물. 가격·상태·판매자·카드 정보 모두 백엔드(GET /api/listings) 응답에서 만든다. */
export type MarketListing = {
  listingId: number;
  status: ListingStatus;
  priceKrw: number;
  sellerNickname: string;
  /** 백엔드 등록 시각(LocalDateTime 문자열). 최신 등록순 정렬에 사용 */
  createdAt: string;
  card: CardData;
};

/**
 * 데이터 출처.
 * - live: Spring 백엔드에서 받은 실제 데이터
 * - demo: 백엔드에 연결하지 못해 데모 데이터로 대체 (Vercel 단독 배포 등). 결제도 브라우저 안에서만 시뮬레이션한다.
 */
export type DataSource = "live" | "demo";

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

function warnFallback(context: string, error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[PokeTrade] 백엔드 호출 실패(${context}) → 데모 데이터로 대체합니다: ${reason}`);
}

/** 마켓플레이스 그리드. 백엔드 호출이 어떤 이유로든 실패하면 데모 매물 8건으로 대체한다. */
export async function fetchMarketListings(): Promise<{ listings: MarketListing[]; source: DataSource }> {
  try {
    const page = await serverApi<PagedResponse<ListingResponse>>(`/listings?status=${ALL_STATUSES.join(",")}&size=100`);
    return { listings: page.content.map(toMarketListing), source: "live" };
  } catch (error) {
    warnFallback("GET /api/listings", error);
    return { listings: DEMO_LISTINGS.map(toMarketListing), source: "demo" };
  }
}

/**
 * 상세/결제: URL 슬러그(백엔드 Card.code)로 매물 조회.
 * 백엔드 호출이 실패(연결 불가·404·5xx 등)하면 같은 코드의 데모 매물로 대체하고, 데모에도 없으면 null.
 * generateMetadata 와 페이지가 같은 요청 안에서 함께 부르므로 React cache 로 한 번만 호출한다.
 */
export const fetchListingByCardCode = cache(async function fetchListingByCardCode(
  code: string,
): Promise<{ listing: MarketListing | null; source: DataSource }> {
  try {
    const listing = await serverApi<ListingResponse>(`/listings/by-card/${encodeURIComponent(code)}`);
    return { listing: toMarketListing(listing), source: "live" };
  } catch (error) {
    warnFallback(`GET /api/listings/by-card/${code}`, error);
    const demo = DEMO_LISTINGS.find((l) => l.card.code === code);
    return { listing: demo ? toMarketListing(demo) : null, source: "demo" };
  }
});
