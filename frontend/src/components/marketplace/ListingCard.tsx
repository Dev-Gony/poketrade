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

export default function ListingCard({ listing }: { listing: MarketListing }) {
  const { card, status, priceKrw } = listing;
  const onSale = status === "ON_SALE";
  const detailHref = routes.card(card.id);
  const checkoutHref = routes.checkout(card.id);
  const grade = GRADE_STYLES[card.grade.company];
  const rising = card.change30dPct >= 0;

  return (
    <article
      className={`group relative flex flex-col xl:flex-row bg-surface-container-low rounded-xl shadow-xl overflow-hidden hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        status === "SOLD" ? "opacity-60" : ""
      }`}
    >
      {/* Holographic Top Glow Shimmer */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${TOP_BAR[card.grade.company]} opacity-70 group-hover:opacity-100 transition-opacity`} />

      {/* Left: Optical Slab Viewport */}
      <div className="xl:w-5/12 p-space-md flex flex-col items-center justify-center bg-surface-container-lowest/80 relative">
        <div className={`w-full max-w-[240px] py-1.5 px-3 rounded-t-md ${grade.plate} flex items-center justify-between mb-2`}>
          <span className="font-label-numeric-sm text-label-numeric-sm font-bold tracking-wider">
            {gradeText(card)} {card.grade.label}
          </span>
          <span className={`font-label-numeric-sm text-label-numeric-sm ${grade.meta}`}>#{card.certNumber.slice(-8)}</span>
        </div>
        <div className="relative w-full aspect-[63/88] max-w-[240px] rounded-lg overflow-hidden shadow-2xl bg-surface-container">
          <img
            alt={card.name.en}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            src={card.imageUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-md text-[10px] font-label-caps text-label-caps text-primary">
            #{card.cardNumber}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 font-label-numeric-sm text-label-numeric-sm text-outline">
          <span className="material-symbols-outlined text-[15px] text-tertiary">lock</span>
          <span>
            <T k="listing.depository" vars={{ id: card.vaultBox }} />
          </span>
        </div>
      </div>

      {/* Right: Trading Spec & Actions */}
      <div className="xl:w-7/12 p-space-lg flex flex-col justify-between gap-space-md">
        <div className="flex flex-col gap-space-xs">
          {/* Badges Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps font-bold ${grade.badge}`}>{gradeText(card)}</span>
            <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps text-primary bg-primary/10 uppercase">{card.setName}</span>
            <ListingStatusBadge className="ml-auto" status={status} />
          </div>

          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight mt-1">
            {/* 카드 전체를 클릭 영역으로 만드는 stretched link. 버튼들은 z-10 으로 그 위에 올린다. */}
            <Link
              className="hover:text-primary transition-colors after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary focus-visible:after:rounded-xl"
              href={detailHref}
            >
              <L text={card.name} />
            </Link>
          </h3>
          <p className="font-body-sm text-body-sm text-outline">
            {card.setName} ({card.year}) · {card.rarity} · #{card.cardNumber}
          </p>

          {/* Seller Metadata Block */}
          <div className="flex items-center gap-space-sm mt-3 pt-3 bg-surface-container/60 p-space-sm rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-xs">
              {card.seller.initials}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-body-md text-body-md font-semibold text-on-surface">{listing.sellerNickname}</span>
                <span className="material-symbols-outlined text-[14px] text-tertiary">verified</span>
              </div>
              <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
                <T k="listing.sellerStats" vars={{ rating: card.seller.rating, count: card.seller.trades }} />
              </span>
            </div>
          </div>
        </div>

        {/* Price & Action Trigger */}
        <div className="flex flex-col gap-space-sm pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-outline uppercase">
                <T k="listing.priceInstant" />
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-label-numeric-lg text-label-numeric-lg text-secondary font-extrabold">
                  <Price krw={priceKrw} />
                </span>
                <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
                  <AltPrice krw={priceKrw} />
                </span>
              </div>
            </div>
            <span
              className={`shrink-0 flex items-center gap-0.5 font-label-numeric-sm text-label-numeric-sm font-semibold ${rising ? "text-tertiary" : "text-error"}`}
            >
              <span className="material-symbols-outlined text-[14px]">{rising ? "trending_up" : "trending_down"}</span>
              {formatChangePct(card.change30dPct)}
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-space-xs mt-1">
            {onSale ? (
              <Link
                className="w-full py-2.5 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-body-md font-bold hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                href={checkoutHref}
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <T k="action.buyNow" />
              </Link>
            ) : (
              <span className="w-full py-2.5 rounded-lg bg-surface-container-high text-outline font-headline-sm text-body-md font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                <span className="material-symbols-outlined text-[18px]">{status === "SOLD" ? "block" : "hourglass_top"}</span>
                <T k={`listing.status.${status}`} />
              </span>
            )}
            <Link
              className="w-full py-2.5 rounded-lg bg-surface-container-high text-secondary hover:bg-surface-container-highest font-headline-sm text-body-md font-semibold transition-all flex items-center justify-center gap-1.5"
              href={detailHref}
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <T k="action.makeOfferShort" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
