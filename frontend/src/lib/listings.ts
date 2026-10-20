import { serverApi, BackendError, type ListingResponse, type ListingStatus, type PagedResponse } from "@/lib/api/backend";
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

/** 마켓플레이스 그리드: H2 에 저장된 판매중·거래중·판매완료 매물 전체 */
export async function fetchMarketListings(): Promise<{ listings: MarketListing[]; totalElements: number }> {
  const page = await serverApi<PagedResponse<ListingResponse>>(`/listings?status=${ALL_STATUSES.join(",")}&size=100`);
  return { listings: page.content.map(toMarketListing), totalElements: page.page.totalElements };
}

/** 상세/결제: URL 슬러그(백엔드 Card.code)로 매물 조회. 매물이 없으면 null */
export async function fetchListingByCardCode(code: string): Promise<MarketListing | null> {
  try {
    return toMarketListing(await serverApi<ListingResponse>(`/listings/by-card/${encodeURIComponent(code)}`));
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null;
    throw error;
  }
}
