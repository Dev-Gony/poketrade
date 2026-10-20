"use client";

import Link from "next/link";
import { useCurrency } from "@/currency/CurrencyProvider";
import { useTranslation } from "@/i18n/I18nProvider";
import type { ListingStatus } from "@/lib/api/backend";

type TransactionBoxProps = {
  checkoutHref: string;
  priceKrw: number;
  topOfferKrw: number;
  status: ListingStatus;
};

export default function TransactionBox({ checkoutHref, priceKrw, topOfferKrw, status }: TransactionBoxProps) {
  const { t } = useTranslation();
  const { format, formatAlt } = useCurrency();

  return (
    <div className="sticky top-28 z-30 rounded-xl p-space-md bg-surface-container shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-space-sm">
        <div>
          <span className="font-label-caps text-label-caps uppercase text-outline">{t("detail.currentPrice")}</span>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="font-headline-lg text-headline-lg font-black text-secondary font-label-numeric-lg tracking-tight">
              {format(priceKrw)}
            </span>
            <span className="font-label-numeric-md text-label-numeric-md text-on-surface-variant font-medium">{formatAlt(priceKrw)}</span>
          </div>
        </div>
        {status === "ON_SALE" ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/20 text-secondary font-label-caps text-label-caps uppercase self-start md:self-auto">
            <span className="material-symbols-outlined text-[15px]">electric_bolt</span>
            <span>{t("detail.onlyOne")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps uppercase self-start md:self-auto">
            <span className="material-symbols-outlined text-[15px]">{status === "SOLD" ? "block" : "hourglass_top"}</span>
            <span>{t(`listing.status.${status}`)}</span>
          </div>
        )}
      </div>

      {/* Dual Call to Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mt-space-sm">
        {status === "ON_SALE" ? (
          <Link
            className="relative group flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg bg-primary-container text-on-primary font-headline-sm text-body-lg font-bold shadow-lg hover:shadow-primary-container/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            href={checkoutHref}
          >
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            <span>{t("action.instantBuy")}</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-6 rounded-lg bg-surface-container-high text-outline font-headline-sm text-body-md font-bold cursor-not-allowed text-center"
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px]">{status === "SOLD" ? "block" : "hourglass_top"}</span>
              {t(`listing.status.${status}`)}
            </span>
            <span className="font-body-sm text-body-sm font-normal">
              {t(status === "SOLD" ? "detail.unavailableSold" : "detail.unavailableReserved")}
            </span>
          </span>
        )}
        <button
          className="flex flex-col items-center justify-center py-2 px-4 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary transition-all"
          type="button"
        >
          <div className="flex items-center gap-1.5 font-headline-sm text-body-md font-bold">
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>{t("action.makeOffer")}</span>
          </div>
          <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
            {t("detail.topOffer", { amount: format(topOfferKrw) })}
          </span>
        </button>
      </div>

      {/* Trust & Escrow Guarantee Footer */}
      <div className="mt-4 pt-3 flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0">verified_user</span>
        <p>
          <strong className="text-tertiary">{t("detail.escrowTitle")}</strong> {t("detail.escrowBody")}
        </p>
      </div>
    </div>
  );
}
