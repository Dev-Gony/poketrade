import Link from "next/link";
import ListingStatusBadge from "@/components/ListingStatusBadge";
import { AltPrice, Price } from "@/currency/CurrencyProvider";
import { L, T } from "@/i18n/I18nProvider";
import { formatChangePct, GRADE_STYLES, gradeText, type CardData } from "@/lib/cards";
import type { MarketListing } from "@/lib/listings";
import { routes } from "@/lib/navigation";

/** 그리드 카드 상단 하이라이트 바. 등급사별로 색을 달리한다. */
const TOP_BAR: Record<CardData["grade"]["company"], string> = {
  PSA: "from-error via-secondary to-primary",
  BGS: "from-secondary via-secondary-fixed to-tertiary",
  CGC: "from-tertiary via-primary to-secondary",
  RAW: "from-outline-variant via-outline to-outline-variant",
};

/**
 * 마켓 그리드용 세로형 카드. 1~4열 어느 폭에서도 같은 구조로 보이도록
 * 슬랩 이미지를 위에, 거래 정보와 버튼을 아래에 둔다. (같은 행의 카드끼리 버튼 높이를 맞추기 위해 h-full + mt-auto)
 */
export default function ListingCard({ listing }: { listing: MarketListing }) {
  const { card, status, priceKrw } = listing;
  const onSale = status === "ON_SALE";
  const detailHref = routes.card(card.id);
  const checkoutHref = routes.checkout(card.id);
  const grade = GRADE_STYLES[card.grade.company];
  const rising = card.change30dPct >= 0;

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.45)] ${
        status === "SOLD" ? "opacity-60" : ""
      }`}
    >
      {/* Holographic Top Glow Shimmer */}
      <div className={`absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r ${TOP_BAR[card.grade.company]} opacity-70 transition-opacity group-hover:opacity-100`} />

      {/* Optical Slab Viewport */}
      <div className="relative flex flex-col items-center bg-surface-container-lowest/80 px-4 pb-3 pt-4">
        <div className={`mb-2 flex w-full max-w-[210px] items-center justify-between rounded-t-md px-2.5 py-1 ${grade.plate}`}>
          <span className="truncate font-label-numeric-sm text-label-numeric-sm font-bold tracking-wider">
            {gradeText(card)} {card.grade.label}
          </span>
          {card.grade.company !== "RAW" && (
            <span className={`ml-2 shrink-0 font-label-numeric-sm text-[10px] ${grade.meta}`}>#{card.certNumber.slice(-6)}</span>
          )}
        </div>
        <div className="relative aspect-[63/88] w-full max-w-[210px] overflow-hidden rounded-lg bg-surface-container shadow-2xl">
          <img
            alt={card.name.en}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            src={card.imageUrl}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
          <div className="absolute bottom-2 left-2 rounded bg-surface-container-lowest/90 px-1.5 py-0.5 font-label-caps text-[10px] text-primary backdrop-blur-md">
            #{card.cardNumber}
          </div>
        </div>
      </div>

      {/* Trading Spec & Actions */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`shrink-0 rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold ${grade.badge}`}>{gradeText(card)}</span>
            <span className="min-w-0 truncate rounded-full bg-primary/10 px-2 py-0.5 font-label-caps text-[10px] uppercase text-primary" title={card.setName}>
              {card.setName}
            </span>
            <ListingStatusBadge className="ml-auto shrink-0 whitespace-nowrap text-[10px]" status={status} />
          </div>

          <h3 className="mt-1 truncate font-headline-sm text-body-lg font-bold tracking-tight text-on-surface" title={card.name.en}>
            {/* 카드 전체를 클릭 영역으로 만드는 stretched link. 버튼들은 z-10 으로 그 위에 올린다. */}
            <Link
              className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-primary"
              href={detailHref}
            >
              <L text={card.name} />
            </Link>
          </h3>
          <p className="truncate font-body-sm text-body-sm text-outline">
            {card.year ? `${card.year} · ` : ""}
            {card.rarity}
          </p>

          {/* Seller */}
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container/20 text-[10px] font-bold text-primary">
              {card.seller.initials}
            </div>
            <span className="truncate font-body-sm text-body-sm font-semibold text-on-surface">{listing.sellerNickname}</span>
            <span className="material-symbols-outlined shrink-0 text-[13px] text-tertiary">verified</span>
            <span className="ml-auto shrink-0 font-label-numeric-sm text-label-numeric-sm text-outline">★ {card.seller.rating}</span>
          </div>
        </div>

        {/* Price & Action Trigger */}
        <div className="mt-auto flex flex-col gap-2.5">
          <div className="flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="font-label-caps text-[10px] uppercase text-outline">
                <T k="listing.priceInstant" />
              </span>
              <span className="truncate font-label-numeric-lg text-label-numeric-lg font-extrabold text-secondary">
                <Price krw={priceKrw} />
              </span>
              <span className="truncate font-label-numeric-sm text-[10px] text-outline">
                <AltPrice krw={priceKrw} />
              </span>
            </div>
            <span
              className={`mb-0.5 flex shrink-0 items-center gap-0.5 font-label-numeric-sm text-label-numeric-sm font-semibold ${rising ? "text-tertiary" : "text-error"}`}
            >
              <span className="material-symbols-outlined text-[14px]">{rising ? "trending_up" : "trending_down"}</span>
              {formatChangePct(card.change30dPct)}
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2">
            {onSale ? (
              <Link
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary-container py-2 font-headline-sm text-body-sm font-bold text-on-primary-container shadow-md transition-all hover:brightness-110 active:scale-95"
                href={checkoutHref}
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <T k="action.buyNow" />
              </Link>
            ) : (
              <span className="flex w-full cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-surface-container-high py-2 font-headline-sm text-body-sm font-bold text-outline">
                <span className="material-symbols-outlined text-[16px]">{status === "SOLD" ? "block" : "hourglass_top"}</span>
                <T k={`listing.status.${status}`} />
              </span>
            )}
            <Link
              className="flex w-full items-center justify-center gap-1 rounded-lg bg-surface-container-high py-2 font-headline-sm text-body-sm font-semibold text-secondary transition-all hover:bg-surface-container-highest"
              href={detailHref}
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              <T k="action.makeOfferShort" />
            </Link>
          </div>

          <div className="flex items-center gap-1 font-label-numeric-sm text-[10px] text-outline">
            <span className="material-symbols-outlined text-[13px] text-tertiary">lock</span>
            <T k="listing.depository" vars={{ id: card.vaultBox }} />
          </div>
        </div>
      </div>
    </article>
  );
}
