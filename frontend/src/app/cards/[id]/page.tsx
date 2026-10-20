import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CardDetails from "@/components/CardDetails";
import SlabViewer from "@/components/SlabViewer";
import TransactionBox from "@/components/TransactionBox";
import DemoModeBadge from "@/components/DemoModeBadge";
import ListingStatusBadge from "@/components/ListingStatusBadge";
import { L, T } from "@/i18n/I18nProvider";
import { getMarketStats, GRADE_STYLES, gradeText } from "@/lib/cards";
import { fetchListingByCardCode, isDemoSource } from "@/lib/listings";
import { routes } from "@/lib/navigation";

type PageProps = {
  params: { id: string };
};

// 가격·재고 상태를 요청마다 백엔드에서 새로 읽는다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listing } = await fetchListingByCardCode(params.id);
  return { title: listing ? `${listing.card.name.en} ${gradeText(listing.card)} | PokeTrade Vault` : "PokeTrade Vault" };
}

/** 카드 상세. Navbar/Footer 는 루트 레이아웃에서 공통으로 렌더한다. */
export default async function CardDetailPage({ params }: PageProps) {
  const { listing, source } = await fetchListingByCardCode(params.id);
  if (!listing) notFound();
  const { card } = listing;
  const market = getMarketStats(card, listing.priceKrw);

  return (
    <div className="max-w-7xl mx-auto px-margin py-space-lg w-full">
      {isDemoSource(source) && <DemoModeBadge source={source} />}
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm mb-space-lg">
        <Link className="hover:text-primary transition-colors flex items-center gap-1 shrink-0" href={routes.marketplace}>
          <span className="material-symbols-outlined text-[16px]">storefront</span>
          <span>
            <T k="nav.marketplace" />
          </span>
        </Link>
        <span className="text-outline-variant">/</span>
        <Link className="hover:text-primary transition-colors shrink-0" href={routes.marketplace}>
          {card.setName}
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-on-surface font-semibold truncate">
          <L text={card.name} /> #{card.cardNumber}
        </span>
      </nav>

      {/* Two-Column Master Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Column (5 cols) */}
        <SlabViewer card={card} />

        {/* Right Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          {/* Header Info & Title */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ListingStatusBadge className="px-2.5 py-1 rounded bg-surface-container" status={listing.status} />
              <span className="px-2.5 py-1 rounded bg-surface-container font-label-caps text-label-caps uppercase text-on-surface-variant">
                {card.setName} ({card.year})
              </span>
              <span className="px-2.5 py-1 rounded bg-secondary-container/20 text-secondary font-label-caps text-label-caps uppercase font-bold">
                {card.rarity} • #{card.cardNumber}
              </span>
              <span
                className={`px-2.5 py-1 rounded font-label-caps text-label-caps uppercase font-extrabold flex items-center gap-1 ${GRADE_STYLES[card.grade.company].badge}`}
              >
                <span className="material-symbols-outlined text-[14px]">stars</span>
                {gradeText(card)} {card.grade.label}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight mt-1">
              <L text={card.name} />
            </h1>
            <div className="flex items-center gap-4 flex-wrap text-on-surface-variant font-body-sm text-body-sm mt-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-tertiary">analytics</span>
                <span>
                  <T k="detail.populationLabel" />{" "}
                  <strong className="text-on-surface font-label-numeric-sm text-label-numeric-sm">{card.population.toLocaleString("en-US")}</strong>
                </span>
              </div>
              <span className="text-outline-variant">•</span>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">workspace_premium</span>
                <span>
                  <T k="detail.higherGradedLabel" />{" "}
                  <strong className="text-secondary font-label-numeric-sm text-label-numeric-sm">
                    {card.higherGradedCount === 0 ? (
                      <T k="detail.higherGradedValue" vars={{ count: 0 }} />
                    ) : (
                      card.higherGradedCount.toLocaleString("en-US")
                    )}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <TransactionBox
            checkoutHref={routes.checkout(card.id)}
            priceKrw={listing.priceKrw}
            status={listing.status}
            topOfferKrw={market.topOfferKrw}
          />

          <CardDetails card={card} market={market} sellerNickname={listing.sellerNickname} />
        </div>
      </div>
    </div>
  );
}
