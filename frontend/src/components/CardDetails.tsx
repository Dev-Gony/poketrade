"use client";

import { useState } from "react";
import { useCurrency } from "@/currency/CurrencyProvider";
import type { TranslationKey } from "@/i18n/dictionaries";
import { formatRelative, formatYearMonth } from "@/i18n/format";
import { useTranslation } from "@/i18n/I18nProvider";
import { formatChangePct, gradeText, type CardData, type ComparableSale, type MarketStats } from "@/lib/cards";

type CardDetailsProps = {
  card: CardData;
  market: MarketStats;
  /** 백엔드 매물의 판매자 닉네임 */
  sellerNickname: string;
};

type SpecRow = {
  labelKey: TranslationKey;
  tone: "default" | "tertiary" | "primary" | "secondary";
} & ({ value: string } | { valueKey: TranslationKey; vars?: Record<string, string> });

function buildSpecs(card: CardData): SpecRow[] {
  return [
    { labelKey: "specs.language", valueKey: card.printLanguage === "ja" ? "specs.languageJa" : "specs.languageValue", tone: "default" },
    { labelKey: "specs.classification", value: card.classification, tone: "default" },
    { labelKey: "specs.cardNumber", value: `${card.setName} #${card.cardNumber}`, tone: "default" },
    { labelKey: "specs.centering", valueKey: "specs.centeringValue", vars: { ratio: "55/45" }, tone: "tertiary" },
    { labelKey: "specs.registry", value: card.grade.company === "RAW" ? "-" : `${gradeText(card)} #${card.certNumber}`, tone: "primary" },
    { labelKey: "specs.storage", valueKey: "specs.storageValue", tone: "secondary" },
  ];
}

/** 우측 컬럼의 판매자 / 시세 / 스펙 섹션. 부모 flex 간격을 그대로 쓰도록 Fragment 로 반환한다. */
export default function CardDetails({ card, market, sellerNickname }: CardDetailsProps) {
  return (
    <>
      <SellerProfile nickname={sellerNickname} seller={card.seller} />
      <MarketIndex market={market} />
      <SpecsAndFulfillment specs={buildSpecs(card)} />
    </>
  );
}

function SellerProfile({ seller, nickname }: { seller: CardData["seller"]; nickname: string }) {
  const { t, intlLocale } = useTranslation();

  return (
    <div className="rounded-xl p-space-md bg-surface-container-low shadow-sm flex flex-col gap-space-sm">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold">
              {seller.initials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[14px]">verified</span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{nickname}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-label-caps text-label-caps uppercase bg-primary/20 text-primary font-bold">
                {t("seller.tier")}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline">
              {t("seller.since", { date: formatYearMonth(intlLocale, seller.memberSince) })}
            </p>
          </div>
        </div>
        <button
          className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md flex items-center gap-1.5 transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>{t("seller.contact")}</span>
        </button>
      </div>

      {/* Seller Key Metric Badges */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <MetricBadge
          label={t("seller.positive")}
          value={t("seller.positiveValue", { pct: seller.positivePct, count: seller.trades })}
          valueClass="text-tertiary"
        />
        <MetricBadge
          label={t("seller.avgResponse")}
          value={t("seller.responseValue", { minutes: seller.avgResponseMinutes })}
          valueClass="text-on-surface"
        />
        <MetricBadge label={t("seller.vaultHandover")} value={t("seller.instantClearing")} valueClass="text-secondary" />
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-high/60 text-outline font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-[16px] text-primary">policy</span>
        <span>{t("seller.guarantee")}</span>
      </div>
    </div>
  );
}

function MetricBadge({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-surface-container text-left">
      <span className="font-label-caps text-[10px] text-outline uppercase block">{label}</span>
      <span className={`font-label-numeric-md text-label-numeric-md font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function MarketIndex({ market }: { market: MarketStats }) {
  const comparableSales: ComparableSale[] = market.comparableSales;
  const rising = market.change30dPct >= 0;
  const { t, intlLocale } = useTranslation();
  const { format } = useCurrency();

  const axisLabels = market.axisMonths.map((month, i) => {
    const label = formatYearMonth(intlLocale, month, "short");
    return i === market.axisMonths.length - 1 ? t("index.today", { label }) : label;
  });

  return (
    <div className="rounded-xl p-space-md bg-surface-container-low shadow-sm flex flex-col gap-space-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{t("index.title")}</h2>
          <p className="font-body-sm text-body-sm text-outline">{t("index.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`whitespace-nowrap px-2 py-1 rounded bg-surface-container font-label-numeric-sm text-label-numeric-sm font-semibold flex items-center gap-1 ${rising ? "text-secondary" : "text-error"}`}
          >
            <span className="material-symbols-outlined text-[14px]">{rising ? "trending_up" : "trending_down"}</span>
            {t("index.change", { pct: formatChangePct(market.change30dPct) })}
          </span>
          <span className="whitespace-nowrap px-2 py-1 rounded bg-surface-container text-on-surface-variant font-label-numeric-sm text-label-numeric-sm">
            {t("index.volume", { amount: format(market.volumeKrw, { compact: true }) })}
          </span>
        </div>
      </div>

      {/* Market Stat Ticker Bar */}
      <div className="grid grid-cols-3 gap-2 py-2">
        <MarketStat label={t("index.low")} value={format(market.low12mKrw)} valueClass="text-on-surface" />
        <MarketStat label={t("index.ath")} value={format(market.allTimeHighKrw)} valueClass="text-secondary" />
        <MarketStat label={t("index.latest")} value={format(market.latestSettlementKrw)} valueClass="text-tertiary" />
      </div>

      <PriceChart axisLabels={axisLabels} rising={rising} />

      {/* Recent Comparable Sales List */}
      <div>
        <h3 className="font-label-caps text-label-caps uppercase text-outline mb-2">{t("index.compsTitle")}</h3>
        <div className="flex flex-col gap-1.5">
          {comparableSales.map((sale) => (
            <div
              key={`${sale.ago.value}-${sale.ago.unit}-${sale.venueKey}`}
              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-body-sm font-body-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${sale.dotTone === "secondary" ? "bg-secondary" : "bg-outline-variant"}`} />
                <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface">
                  {formatRelative(intlLocale, -sale.ago.value, sale.ago.unit)}
                </span>
                <span className="text-outline">•</span>
                <span className={`font-label-caps text-[10px] ${sale.venueTone === "tertiary" ? "text-tertiary" : "text-on-surface-variant"}`}>
                  {t(sale.venueKey)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-surface text-outline font-label-numeric-sm text-label-numeric-sm">{market.gradeLabel}</span>
                <span className="font-label-numeric-md text-label-numeric-md font-bold text-on-surface">{format(sale.krw)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketStat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="p-2 rounded bg-surface-container">
      <span className="font-label-caps text-[10px] uppercase text-outline block">{label}</span>
      <span className={`font-label-numeric-sm text-label-numeric-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// 상승/하락 추세에 따라 다른 곡선을 그린다. (끝점 600,y 에 현재가 비컨, peak 는 기간 고점)
const CHART = {
  up: { line: "M 0,130 Q 80,140 140,110 T 260,115 T 360,75 T 460,30 T 540,55 L 600,45", end: 45, peak: { x: 460, y: 30 } },
  down: { line: "M 0,70 Q 80,40 140,55 T 260,30 T 360,60 T 460,85 T 540,95 L 600,110", end: 110, peak: { x: 260, y: 30 } },
} as const;

function PriceChart({ axisLabels, rising }: { axisLabels: readonly string[]; rising: boolean }) {
  const chart = rising ? CHART.up : CHART.down;
  return (
    <div className="relative w-full h-44 rounded-lg bg-surface-container p-3 flex flex-col justify-between overflow-hidden">
      {/* Gridlines */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 pointer-events-none opacity-10">
        <div className="w-full h-px bg-outline" />
        <div className="w-full h-px bg-outline" />
        <div className="w-full h-px bg-outline" />
      </div>

      {/* SVG Line Graph */}
      <div className="w-full h-full relative z-10">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 160">
          <defs>
            <linearGradient id="chartGlow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopOpacity="0.35" style={{ stopColor: "rgb(var(--color-secondary))" }} />
              <stop offset="100%" stopOpacity="0.0" style={{ stopColor: "rgb(var(--color-secondary))" }} />
            </linearGradient>
          </defs>
          {/* Area Fill */}
          <path d={`${chart.line} L 600,160 L 0,160 Z`} fill="url(#chartGlow)" />
          {/* Stroke */}
          <path className="stroke-secondary" d={chart.line} fill="none" strokeLinecap="round" strokeWidth="3" />
          {/* Current Point Beacon */}
          <circle className="animate-pulse fill-secondary" cx="600" cy={chart.end} r="5" />
          <circle className="fill-tertiary" cx={chart.peak.x} cy={chart.peak.y} r="4" />
        </svg>
      </div>

      {/* Month Label X-Axis */}
      <div className="flex items-center justify-between text-[10px] font-label-numeric-sm text-outline z-10 pt-1">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

const SPEC_TONE_CLASS: Record<SpecRow["tone"], string> = {
  default: "font-semibold text-on-surface",
  tertiary: "font-label-numeric-sm text-label-numeric-sm font-bold text-tertiary",
  primary: "font-label-numeric-sm text-label-numeric-sm font-bold text-primary",
  secondary: "font-semibold text-secondary",
};

type DeliveryMethod = "vault" | "freight";

const DELIVERY_OPTIONS: { value: DeliveryMethod; titleKey: TranslationKey; descriptionKey: TranslationKey }[] = [
  { value: "vault", titleKey: "delivery.vault", descriptionKey: "delivery.vaultDesc" },
  { value: "freight", titleKey: "delivery.freight", descriptionKey: "delivery.freightDesc" },
];

function SpecsAndFulfillment({ specs }: { specs: readonly SpecRow[] }) {
  const { t } = useTranslation();
  const [delivery, setDelivery] = useState<DeliveryMethod>("vault");

  return (
    <div className="rounded-xl p-space-md bg-surface-container-low shadow-sm">
      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-3">{t("specs.title")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-body-sm font-body-sm">
        {specs.map((spec) => (
          <div key={spec.labelKey} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-container">
            <span className="text-outline">{t(spec.labelKey)}</span>
            <span className={`text-right ${SPEC_TONE_CLASS[spec.tone]}`}>
              {"valueKey" in spec ? t(spec.valueKey, spec.vars) : spec.value}
            </span>
          </div>
        ))}
      </div>

      {/* Fulfillment Options */}
      <div className="mt-4 pt-3 flex flex-col gap-2">
        <span className="font-label-caps text-label-caps uppercase text-outline">{t("specs.fulfillment")}</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DELIVERY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-2.5 p-3 rounded-lg cursor-pointer transition-colors ${
                delivery === option.value ? "bg-surface-container-high ring-1 ring-primary/40" : "bg-surface-container hover:bg-surface-container-high"
              }`}
            >
              <input
                checked={delivery === option.value}
                className="mt-1 accent-primary"
                name="delivery"
                onChange={() => setDelivery(option.value)}
                type="radio"
                value={option.value}
              />
              <div>
                <div className="font-semibold text-on-surface">{t(option.titleKey)}</div>
                <div className="text-xs text-outline mt-0.5">{t(option.descriptionKey)}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
