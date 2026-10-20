import { T } from "@/i18n/I18nProvider";
import type { ListingStatus } from "@/lib/api/backend";

const STYLES: Record<ListingStatus, { className: string; dot: string }> = {
  ON_SALE: { className: "text-tertiary", dot: "bg-tertiary" },
  RESERVED: { className: "text-secondary", dot: "bg-secondary animate-pulse" },
  SOLD: { className: "text-outline", dot: "bg-outline" },
};

/** 백엔드 매물 상태(판매중 / 거래 진행 중 / 판매 완료) 표시 */
export default function ListingStatusBadge({ status, className = "" }: { status: ListingStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span className={`font-label-caps text-label-caps flex items-center gap-1 ${style.className} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <T k={`listing.status.${status}`} />
    </span>
  );
}
