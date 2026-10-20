"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney, useCurrency } from "@/currency/CurrencyProvider";
import type { TranslationKey } from "@/i18n/dictionaries";
import { useTranslation } from "@/i18n/I18nProvider";
import { BACKEND_ERROR_CODES, BackendError, browserApi, type OrderResponse } from "@/lib/api/backend";
import { BANKS, type BankCode, type CheckoutData } from "@/lib/checkout";
import { createDemoOrder } from "@/lib/demoPayment";
import type { MarketListing } from "@/lib/listings";
import { useSession } from "@/session/SessionProvider";
import VirtualAccountModal from "./VirtualAccountModal";

type PaymentTab = "virtual" | "card" | "simple";
/** idle → issuing(주문 생성 API 호출) → issued(가상계좌 입금 대기) → paid(웹훅 반영 완료) */
type PaymentStatus = "idle" | "issuing" | "issued" | "paid";
type PanelError = { key: TranslationKey } | null;

/** 백엔드 ErrorCode → 화면 안내 문구 */
function orderErrorKey(error: unknown): TranslationKey {
  if (!(error instanceof BackendError) || error.isUnavailable) return "order.error.network";
  switch (error.code) {
    case BACKEND_ERROR_CODES.LISTING_NOT_AVAILABLE:
    case BACKEND_ERROR_CODES.LISTING_NOT_FOUND:
      return "order.error.L002";
    case BACKEND_ERROR_CODES.SELF_PURCHASE_NOT_ALLOWED:
      return "order.error.L004";
    case BACKEND_ERROR_CODES.USER_NOT_FOUND:
      return "order.error.U001";
    case BACKEND_ERROR_CODES.LOCK_ACQUISITION_FAILED:
      return "order.error.C002";
    default:
      return "va.error";
  }
}

const FILLED_ICON = { fontVariationSettings: "'FILL' 1" } as const;

const TABS: { id: PaymentTab; icon: string; labelKey: TranslationKey; hintKey: TranslationKey; hintClass: string }[] = [
  { id: "virtual", icon: "account_balance", labelKey: "pay.virtual", hintKey: "pay.virtualHint", hintClass: "text-tertiary" },
  { id: "card", icon: "credit_card", labelKey: "pay.card", hintKey: "pay.cardHint", hintClass: "text-outline" },
  { id: "simple", icon: "smartphone", labelKey: "pay.simple", hintKey: "pay.simpleHint", hintClass: "text-outline" },
];

const FIELD = "w-full bg-surface-container-high text-on-surface font-body-md text-body-md rounded-lg px-3 py-2.5 focus:outline-none focus:bg-surface-container-highest disabled:opacity-60";
const FIELD_LABEL = "block font-label-numeric-sm text-label-numeric-sm text-outline mb-1";

type PaymentPanelProps = {
  listing: MarketListing;
  data: CheckoutData;
  cardHref: string;
  /** 백엔드 미연결 시 주문·가상계좌 발급을 브라우저 안에서 시뮬레이션 */
  demoMode?: boolean;
};

export default function PaymentPanel({ listing, data, cardHref, demoMode = false }: PaymentPanelProps) {
  const { card } = listing;
  const { t } = useTranslation();
  const { user } = useSession();
  const { currency, format } = useCurrency();
  const [tab, setTab] = useState<PaymentTab>("virtual");
  const [bank, setBank] = useState<BankCode>(BANKS[0].code);
  const [depositor, setDepositor] = useState<string>(data.shipping.recipient);
  const [cashReceipt, setCashReceipt] = useState(true);
  const [receiptNumber, setReceiptNumber] = useState<string>(data.shipping.phone);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState<PanelError>(null);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // 상품 금액은 백엔드 매물 가격. 실제 청구 금액은 주문 생성 응답(order.amount)이 최종 기준이다.
  const totalKrw = listing.priceKrw + data.shippingKrw + data.inspectionFeeKrw;
  const locked = status !== "idle";

  const executePayment = async () => {
    if (order) {
      // 이미 주문(가상계좌)이 생성됐으면 다시 만들지 않고 안내 화면만 연다.
      setModalOpen(true);
      return;
    }
    if (!termsAccepted) {
      setError({ key: "pay.termsRequired" });
      return;
    }
    if (tab !== "virtual") {
      setError({ key: "pay.pgUnavailable" });
      return;
    }
    if (!user) {
      setError({ key: "order.loginRequired" });
      return;
    }

    setError(null);
    setStatus("issuing");
    try {
      // 즉시 구매: 백엔드가 매물을 비관적 락으로 선점(RESERVED)하고 가상계좌를 발급한다.
      // 데모 모드에서는 백엔드가 없으므로 같은 형태의 주문을 브라우저에서 만든다.
      const created = demoMode
        ? await createDemoOrder({ listingId: listing.listingId, amount: totalKrw, buyerId: user.id, bank, depositorName: depositor })
        : await browserApi<OrderResponse>("/orders", {
            method: "POST",
            headers: { "X-User-Id": String(user.id) },
            body: { listingId: listing.listingId, bank, depositorName: depositor.trim() || undefined },
          });
      setOrder(created);
      setStatus("issued");
      setModalOpen(true);
    } catch (e) {
      setStatus("idle");
      setError({ key: orderErrorKey(e) });
    }
  };

  return (
    <div className="lg:col-span-7 bg-surface-container-lowest p-6 md:p-8 flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Payment Method Selector Tabs */}
        <div>
          <span className="block font-label-caps text-label-caps uppercase text-outline tracking-wider mb-2.5">{t("pay.methodTitle")}</span>
          <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container rounded-lg" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                aria-selected={tab === item.id}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-200 ${
                  tab === item.id ? "bg-surface-container-high text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                }`}
                disabled={locked}
                onClick={() => {
                  setTab(item.id);
                  setError(null);
                }}
                role="tab"
                type="button"
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                  <span className="font-headline-sm text-xs font-bold text-center">{t(item.labelKey)}</span>
                </div>
                <span className={`font-label-numeric-sm text-[10px] text-center ${item.hintClass}`}>{t(item.hintKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {tab === "virtual" ? (
          <div className="bg-surface-container-low rounded-xl p-4 space-y-4" role="tabpanel">
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline-sm text-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">savings</span>
                {t("pay.virtualTitle")}
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded text-[11px] font-label-numeric-sm text-secondary bg-secondary/15 font-semibold">
                {t("pay.deadlineBadge")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className={FIELD_LABEL} htmlFor="bank-select">
                  {t("pay.bank")}
                </label>
                <div className="relative">
                  <select
                    className={`${FIELD} appearance-none cursor-pointer pr-9`}
                    disabled={locked}
                    id="bank-select"
                    onChange={(e) => setBank(e.target.value as BankCode)}
                    value={bank}
                  >
                    {BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {t(b.labelKey)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-outline text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className={FIELD_LABEL} htmlFor="depositor-name">
                  {t("pay.depositor")}
                </label>
                <input
                  className={FIELD}
                  disabled={locked}
                  id="depositor-name"
                  maxLength={20}
                  onChange={(e) => setDepositor(e.target.value)}
                  type="text"
                  value={depositor}
                />
              </div>
            </div>

            <div className="p-3 bg-surface-container rounded-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">timer</span>
                <div className="flex flex-col">
                  <span className="font-label-numeric-sm text-label-numeric-sm text-outline">{t("pay.deadline")}</span>
                  <span className="font-label-numeric-md text-label-numeric-md text-on-surface font-bold">{t("pay.deadlineAfterIssue")}</span>
                </div>
              </div>
              <span className="shrink-0 font-label-caps text-label-caps px-2 py-1 rounded bg-tertiary/10 text-tertiary font-bold uppercase">
                {t("pay.automatedEscrow")}
              </span>
            </div>

            {/* Cash Receipt Toggle */}
            <div className="pt-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    checked={cashReceipt}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                    onChange={(e) => setCashReceipt(e.target.checked)}
                    type="checkbox"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface font-medium">{t("pay.cashReceipt")}</span>
                </label>
                <span className="shrink-0 font-label-numeric-sm text-[11px] text-outline">{t("pay.cashReceiptHint")}</span>
              </div>
              {cashReceipt && (
                <div className="mt-2.5 flex gap-2">
                  <input
                    aria-label={t("pay.receiptNumber")}
                    className="w-full bg-surface-container-high text-on-surface font-label-numeric-md text-label-numeric-md rounded-lg px-3 py-2 focus:outline-none"
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder={t("pay.receiptPlaceholder")}
                    type="text"
                    value={receiptNumber}
                  />
                  <button
                    className="px-3.5 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-highest font-label-numeric-sm text-label-numeric-sm font-semibold whitespace-nowrap transition-colors"
                    type="button"
                  >
                    {t("pay.verify")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl p-5 text-center space-y-3" role="tabpanel">
            <span className="material-symbols-outlined text-[36px] text-primary">{tab === "card" ? "credit_card" : "smartphone"}</span>
            <p className="font-body-md text-body-md text-on-surface font-semibold">{t("pay.gatewayTitle")}</p>
            <p className="font-body-sm text-body-sm text-outline">{t("pay.gatewayBody")}</p>
          </div>
        )}

        {/* Order Cost Summary Ledger */}
        <div className="space-y-2.5 pt-2">
          <LedgerRow label={t("pay.subtotal")}>
            <span className="font-label-numeric-md text-label-numeric-md text-on-surface font-medium">{format(listing.priceKrw)}</span>
          </LedgerRow>
          <LedgerRow
            label={
              <span className="flex items-center gap-1">
                {t("pay.shipping")}
                <span className="material-symbols-outlined text-[14px] text-outline cursor-help" title={t("pay.shippingInfo")}>
                  info
                </span>
              </span>
            }
          >
            <div className="flex items-center gap-1.5 font-label-numeric-md text-label-numeric-md">
              <span className="text-outline line-through text-xs">{format(data.shippingOriginalKrw)}</span>
              <span className="text-tertiary font-semibold">{t("pay.vipPromo", { amount: format(data.shippingKrw) })}</span>
            </div>
          </LedgerRow>
          <LedgerRow label={t("pay.inspectionFee")}>
            <span className="font-label-numeric-md text-label-numeric-md text-tertiary font-semibold">
              {t("pay.free", { amount: format(data.inspectionFeeKrw) })}
            </span>
          </LedgerRow>
          <div className="pt-3 flex items-baseline justify-between gap-3">
            <div>
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider block">{t("pay.total")}</span>
              <span className="font-body-sm text-[11px] text-outline">{t("pay.totalNote")}</span>
            </div>
            <div className="text-right">
              <span className="block font-display text-[32px] md:text-[38px] leading-tight font-extrabold text-primary tracking-tight">
                {format(totalKrw)}
              </span>
              {/* 표시는 USD 여도 가상계좌 청구는 원화로 이뤄지므로 실제 청구 금액을 함께 보여 준다. */}
              {currency !== "KRW" && (
                <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
                  {t("pay.chargedInKrw", { amount: formatMoney(totalKrw, "KRW") })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className={`rounded-lg p-3.5 ${error?.key === "pay.termsRequired" ? "bg-error-container/30 ring-1 ring-error/60" : "bg-surface-container"}`}>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              checked={termsAccepted}
              className="w-4 h-4 rounded accent-primary mt-0.5 cursor-pointer"
              disabled={locked}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked && error?.key === "pay.termsRequired") setError(null);
              }}
              type="checkbox"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              <TermsText />
            </span>
          </label>
        </div>

        {error && (
          <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {t(error.key)}
          </p>
        )}
      </div>

      {/* Primary CTA & Cancel Action */}
      <div className="pt-2 space-y-3">
        <button
          className={`w-full py-4 px-6 rounded-xl hover:brightness-110 active:scale-[0.99] font-headline-sm text-headline-sm font-bold tracking-tight shadow-xl flex items-center justify-center gap-2 text-center transition-all duration-150 cursor-pointer disabled:cursor-wait ${
            status === "issued" || status === "paid"
              ? "bg-tertiary-container text-on-tertiary-container"
              : "bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary-container"
          }`}
          disabled={status === "issuing"}
          onClick={executePayment}
          type="button"
        >
          {status === "issuing" && (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              {t("pay.processing")}
            </>
          )}
          {status === "issued" && (
            <>
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
              {t("pay.viewAccount")}
            </>
          )}
          {status === "paid" && (
            <>
              <span className="material-symbols-outlined text-[20px]" style={FILLED_ICON}>
                check_circle
              </span>
              {t("pay.paid")}
            </>
          )}
          {status === "idle" && (
            <>
              <span className="material-symbols-outlined text-[20px]" style={FILLED_ICON}>
                {{ virtual: "lock", card: "credit_card", simple: "bolt" }[tab]}
              </span>
              <span>
                {tab === "virtual" && t("pay.payVirtual", { amount: format(totalKrw) })}
                {tab === "card" && t("pay.payCard")}
                {tab === "simple" && t("pay.paySimple")}
              </span>
            </>
          )}
        </button>
        <div className="flex items-center justify-center">
          <Link className="font-body-sm text-body-sm text-outline hover:text-on-surface transition-colors flex items-center gap-1" href={cardHref}>
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            {t("pay.back")}
          </Link>
        </div>
      </div>

      {modalOpen && order && (
        <VirtualAccountModal
          card={card}
          demoMode={demoMode}
          onClose={() => setModalOpen(false)}
          onPaid={(paid) => {
            // 여기서 router.refresh() 를 하면 결제 페이지가 "판매 완료" 안내로 다시 그려져 영수증이 사라진다.
            // 목록·상세의 최신 상태는 next.config 의 staleTimes.dynamic=0 덕분에 이동 시 새로 읽힌다.
            setOrder(paid);
            setStatus("paid");
          }}
          order={order}
        />
      )}
    </div>
  );
}

function LedgerRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 font-body-sm text-body-sm">
      <span className="text-outline">{label}</span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

function TermsText() {
  const { t, tRich } = useTranslation();
  return (
    <>
      {tRich("pay.terms", {
        terms: <strong className="text-on-surface font-semibold underline decoration-outline">{t("pay.termsLink")}</strong>,
      })}
    </>
  );
}
