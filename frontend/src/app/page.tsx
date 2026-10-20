import BackendUnavailable from "@/components/BackendUnavailable";
import MarketplaceView from "@/components/marketplace/MarketplaceView";
import { BACKEND_URL, BackendError } from "@/lib/api/backend";
import { fetchMarketListings, type MarketListing } from "@/lib/listings";

// 매물 상태(판매중/거래중/판매완료)를 요청마다 백엔드에서 새로 읽는다.
export const dynamic = "force-dynamic";

/** 마켓플레이스 메인. 매물은 서버에서 백엔드로 받아오고, 검색·필터·정렬은 MarketplaceView 가 즉시 처리한다. */
export default async function MarketplacePage() {
  let listings: MarketListing[];
  try {
    ({ listings } = await fetchMarketListings());
  } catch (error) {
    if (error instanceof BackendError) return <BackendUnavailable backendUrl={BACKEND_URL} />;
    throw error;
  }

  return <MarketplaceView listings={listings} />;
}
