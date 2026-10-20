import DemoModeBadge from "@/components/DemoModeBadge";
import MarketplaceView from "@/components/marketplace/MarketplaceView";
import { fetchMarketListings, isDemoSource } from "@/lib/listings";

// 매물 상태(판매중/거래중/판매완료)를 요청마다 백엔드에서 새로 읽는다.
export const dynamic = "force-dynamic";

/**
 * 마켓플레이스 메인. 매물은 서버에서 백엔드로 받아오고, 검색·필터·정렬은 MarketplaceView 가 즉시 처리한다.
 * 백엔드에 연결할 수 없으면 Pokémon TCG API 실제 카드(실패 시 내장 데모)로 화면을 그리고 '데모 모드' 뱃지만 표시한다.
 */
export default async function MarketplacePage() {
  const { listings, source } = await fetchMarketListings();

  return (
    <>
      {isDemoSource(source) && <DemoModeBadge source={source} />}
      <MarketplaceView listings={listings} />
    </>
  );
}
