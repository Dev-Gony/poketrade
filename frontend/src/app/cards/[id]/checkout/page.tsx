import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutModal from "@/components/checkout/CheckoutModal";
import DemoModeBadge from "@/components/DemoModeBadge";
import { T } from "@/i18n/I18nProvider";
import { gradeText } from "@/lib/cards";
import { CHECKOUT } from "@/lib/checkout";
import { fetchListingByCardCode } from "@/lib/listings";
import { routes } from "@/lib/navigation";

type PageProps = {
  params: { id: string };
};

// 결제 직전 매물 상태를 백엔드에서 새로 확인한다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listing } = await fetchListingByCardCode(params.id);
  return { title: listing ? `Checkout · ${listing.card.name.en} ${gradeText(listing.card)} | PokeTrade Vault` : "PokeTrade Vault" };
}

/** 에스크로 결제. Navbar/Footer 는 루트 레이아웃에서 공통으로 렌더한다. */
export default async function CheckoutPage({ params }: PageProps) {
  const { listing, source } = await fetchListingByCardCode(params.id);
  if (!listing) notFound();

  // 이미 거래 중이거나 판매된 매물은 결제 화면 대신 안내를 보여 준다.
  if (listing.status !== "ON_SALE") {
    return (
      <div className="max-w-xl mx-auto my-16 px-margin flex flex-col items-center text-center gap-space-md">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px] text-outline">{listing.status === "SOLD" ? "block" : "hourglass_top"}</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-bold">
          <T k={`listing.status.${listing.status}`} />
        </h1>
        <p className="font-body-md text-body-md text-outline">
          <T k={listing.status === "SOLD" ? "detail.unavailableSold" : "detail.unavailableReserved"} />
        </p>
        <Link
          className="mt-space-sm px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-bold flex items-center gap-1.5 hover:brightness-110 transition-all"
          href={routes.marketplace}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          <T k="section.back" />
        </Link>
      </div>
    );
  }

  return (
    <>
      {source === "demo" && <DemoModeBadge />}
      <CheckoutModal cardHref={routes.card(listing.card.id)} data={CHECKOUT} demoMode={source === "demo"} listing={listing} />
    </>
  );
}
