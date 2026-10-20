"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney, useCurrency } from "@/currency/CurrencyProvider";
import { formatDateTime } from "@/i18n/format";
import { useTranslation } from "@/i18n/I18nProvider";
import { parseServerDateTime, type OrderResponse } from "@/lib/api/backend";
import type { CardData } from "@/lib/cards";
import { bankLabelKey, formatAccountNumber } from "@/lib/checkout";
import { confirmDemoDeposit } from "@/lib/demoPayment";
import { routes } from "@/lib/navigation";

/** 입금 확인 로딩을 사람이 인지할 수 있도록 보장하는 최소 시간 */
const MIN_CONFIRM_MS = 1200;

type Phase = "awaiting" | "confirming" | "paid";

type VirtualAccountModalProps = {
  /** 백엔드 주문(가상계좌) 응답 */
  order: OrderResponse;
  card: CardData;
  onClose: () => void;
  onPaid: (order: OrderResponse) => void;
  /** 백엔드 미연결 시 입금 웹훅을 브라우저 안에서 시뮬레이션 */
  demoMode?: boolean;
};

const toIso = (value: string) => parseServerDateTime(value).toISOString();

export default function VirtualAccountModal({ order, card, onClose, onPaid, demoMode = false }: VirtualAccountModalProps) {
  const { t, pick, intlLocale } = useTranslation();
  const { currency, format } = useCurrency();
  const [phase, setPhase] = useState<Phase>(order.status === "PAID" ? "paid" : "awaiting");
  const [paidOrder, setPaidOrder] = useState<OrderResponse | null>(order.status === "PAID" ? order : null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const account = order.virtualAccount;
  const accountNumber = account.accountNumber ?? "";

  // 모달이 열리면 포커스를 옮기고, 확인 중이 아닐 때만 Esc 로 닫는다.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "confirming") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [phase, onClose]);

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 무시
    }
  };

  /**
   * 시연용: 모의 PG 라우트(/api/mock-pg/deposit)가 실제 PG 처럼 입금 완료 웹훅을 Spring 백엔드로 보낸다.
   * 백엔드가 금액 검증 후 주문 PAID, 매물 SOLD 로 전이하고, 갱신된 주문을 돌려받는다.
   */
  const simulateDeposit = async () => {
    setPhase("confirming");
    setError(false);
    try {
      const deposit = async (): Promise<OrderResponse> => {
        if (demoMode) return confirmDemoDeposit(order);
        const response = await fetch("/api/mock-pg/deposit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.orderId }),
        });
        if (!response.ok) throw new Error(`deposit failed: ${response.status}`);
        return ((await response.json()) as { order: OrderResponse }).order;
      };
      const [updated] = await Promise.all([deposit(), new Promise((resolve) => setTimeout(resolve, MIN_CONFIRM_MS))]);
      if (updated.status !== "PAID") throw new Error(`unexpected status: ${updated.status}`);
      setPaidOrder(updated);
      setPhase("paid");
      onPaid(updated);
    } catch {
      setError(true);
      setPhase("awaiting");
    }
  };

  const bankName = t(bankLabelKey(account.bankCode));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={phase === "confirming" ? undefined : onClose} />

      <div
        ref={dialogRef}
        aria-labelledby="va-title"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xl focus:outline-none"
        role="dialog"
        tabIndex={-1}
      >
        {phase === "paid" && paidOrder ? (
          <PaidReceipt card={card} onClose={onClose} order={paidOrder} />
        ) : (
          <>
            <div className="px-6 pt-6 pb-4 flex items-start gap-3">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-tertiary-container/25 flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[24px]">account_balance</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface" id="va-title">
                  {t("va.title")}
                </h2>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">{t("va.subtitle")}</p>
              </div>
              <button
                aria-label={t("va.close")}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-40"
                disabled={phase === "confirming"}
                onClick={onClose}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="px-6 space-y-3">
              {/* 계좌번호 강조 블록 */}
              <div className="rounded-xl bg-surface-container p-4">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps uppercase text-outline">{t("va.accountNumber")}</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">{bankName}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-label-numeric-lg text-[22px] leading-8 font-bold tracking-wide text-primary break-all">
                    {formatAccountNumber(accountNumber)}
                  </span>
                  <button
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-label-numeric-sm text-label-numeric-sm text-on-surface transition-colors"
                    onClick={copyAccountNumber}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                    {copied ? t("va.copied") : t("va.copy")}
                  </button>
                </div>
              </div>

              <dl className="rounded-xl bg-surface-container/60 divide-y divide-outline-variant/30">
                <Row label={t("va.bank")} value={bankName} />
                <Row label={t("va.depositor")} value={account.depositorName ?? "-"} />
                <Row label={t("va.dueAt")} value={formatDateTime(intlLocale, toIso(order.paymentDueAt))} valueClass="text-secondary" />
                <Row label={t("va.item")} value={pick(card.name)} />
                <Row label={t("va.orderNo")} mono value={order.orderNo} />
                <Row
                  label={t("va.amount")}
                  value={
                    <span className="flex flex-col items-end">
                      <span className="font-label-numeric-lg text-label-numeric-lg font-extrabold text-primary">{format(order.amount)}</span>
                      {currency !== "KRW" && (
                        <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
                          {t("pay.chargedInKrw", { amount: formatMoney(order.amount, "KRW") })}
                        </span>
                      )}
                    </span>
                  }
                />
              </dl>

              <p className="flex items-center justify-center gap-1.5 py-1 font-body-sm text-body-sm text-outline">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                {t("va.waiting")}
              </p>

              {error && (
                <p className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {t("va.error")}
                </p>
              )}
            </div>

            {/* 시연용 웹훅 트리거 */}
            <div className="mt-4 px-6 py-5 border-t border-dashed border-outline-variant/50 bg-surface-container-lowest/60">
              <button
                className="w-full py-3.5 rounded-xl bg-tertiary-container text-on-tertiary-container font-headline-sm text-body-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:cursor-wait disabled:opacity-80"
                disabled={phase === "confirming"}
                onClick={simulateDeposit}
                type="button"
              >
                <span className={`material-symbols-outlined text-[20px] ${phase === "confirming" ? "animate-spin" : ""}`}>
                  {phase === "confirming" ? "progress_activity" : "webhook"}
                </span>
                {phase === "confirming" ? t("va.confirming") : t("va.simulate")}
              </button>
              <p className="mt-2 text-center font-body-sm text-[11px] text-outline">{t("va.simulateHint")}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaidReceipt({ order, card, onClose }: { order: OrderResponse; card: CardData; onClose: () => void }) {
  const { t, pick, intlLocale } = useTranslation();
  const { format } = useCurrency();
  const account = order.virtualAccount;

  return (
    <div className="p-6">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-tertiary-container/25 flex items-center justify-center">
          <span className="material-symbols-outlined text-[40px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
            check_circle
          </span>
        </div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface" id="va-title">
          {t("va.paidTitle")}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant" role="status">
          {t("va.paidMessage")}
        </p>
      </div>

      {/* 영수증 */}
      <div className="mt-5 rounded-xl bg-surface-container overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-outline-variant/30">
          <img alt={card.name.en} className="w-12 h-16 rounded object-cover shrink-0" src={card.imageUrl} />
          <div className="min-w-0">
            <p className="font-body-md text-body-md font-semibold text-on-surface truncate">{pick(card.name)}</p>
            <p className="font-label-numeric-sm text-label-numeric-sm text-outline">
              {card.grade.company} {card.grade.score} · #{card.certNumber}
            </p>
          </div>
        </div>
        <div className="px-3 pt-2 font-label-caps text-label-caps uppercase text-outline">{t("va.receipt")}</div>
        <dl className="divide-y divide-outline-variant/30">
          <Row label={t("va.orderNo")} mono value={order.orderNo} />
          {order.pgTransactionId && <Row label={t("va.txId")} mono value={order.pgTransactionId} />}
          {order.paidAt && <Row label={t("va.paidAt")} value={formatDateTime(intlLocale, toIso(order.paidAt))} />}
          <Row label={t("va.bank")} value={`${t(bankLabelKey(account.bankCode))} ${formatAccountNumber(account.accountNumber ?? "")}`} />
          <Row
            label={t("va.amount")}
            value={<span className="font-label-numeric-md text-label-numeric-md font-bold text-primary">{format(order.amount)}</span>}
          />
        </dl>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Link
          className="py-3 rounded-xl bg-primary-container text-on-primary-container font-body-md text-body-md font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all"
          href={routes.section("my-vault")}
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          {t("va.goVault")}
        </Link>
        <Link
          className="py-3 rounded-xl bg-surface-container-high text-on-surface font-body-md text-body-md font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-highest transition-colors"
          href={routes.marketplace}
        >
          <span className="material-symbols-outlined text-[18px]">storefront</span>
          {t("va.backToMarket")}
        </Link>
      </div>
      <button className="mt-3 w-full font-body-sm text-body-sm text-outline hover:text-on-surface" onClick={onClose} type="button">
        {t("va.close")}
      </button>
    </div>
  );
}

function Row({ label, value, valueClass = "text-on-surface", mono = false }: { label: string; value: React.ReactNode; valueClass?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 font-body-sm text-body-sm">
      <dt className="text-outline shrink-0">{label}</dt>
      <dd className={`text-right font-semibold break-all ${mono ? "font-label-numeric-sm text-label-numeric-sm" : ""} ${valueClass}`}>{value}</dd>
    </div>
  );
}
