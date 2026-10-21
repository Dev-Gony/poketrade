"use client";

import Link from "next/link";
import { REPOSITORY_URL } from "@/components/DemoNotice";
import type { TranslationKey } from "@/i18n/dictionaries";
import { useTranslation } from "@/i18n/I18nProvider";
import { routes, type SectionSlug } from "@/lib/navigation";

/** 화면에 표시하는 감정사 라벨. 제휴·연동 관계가 아님을 푸터 문구로 함께 밝힌다. */
const GRADING_LABELS = [
  { label: "PSA", dot: "bg-error" },
  { label: "BGS (Beckett)", dot: "bg-secondary" },
  { label: "CGC", dot: "bg-tertiary" },
];

/** 이 데모가 실제로 구현한 기능 → README 해당 절로 연결 */
const FEATURES: { labelKey: TranslationKey; anchor: string }[] = [
  { labelKey: "footer.featureLock", anchor: "4-핵심-문제-해결--비관적-락으로-1장-한정-매물-동시성-제어" },
  { labelKey: "footer.featureWebhook", anchor: "5-핵심-문제-해결--가상계좌-웹훅-멱등성-보장" },
  { labelKey: "footer.featureExpiry", anchor: "6-그-밖의-설계-고민" },
  { labelKey: "footer.featureTests", anchor: "7-테스트" },
];

const PAYMENT_METHODS: { labelKey: TranslationKey; supported: boolean }[] = [
  { labelKey: "footer.paymentVirtual", supported: true },
  { labelKey: "footer.paymentUnsupported", supported: false },
];

const LEGAL_LINKS: { labelKey: TranslationKey; section: SectionSlug }[] = [
  { labelKey: "footer.terms", section: "terms" },
  { labelKey: "footer.privacy", section: "privacy" },
  { labelKey: "footer.escrowTerms", section: "escrow-terms" },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-outline-variant/30 text-on-surface-variant">
      <div className="max-w-7xl mx-auto px-margin py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-space-xs mb-3">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">POKETRADE</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-label-caps text-label-caps bg-primary-container/20 text-primary border border-primary/40 uppercase">
                Demo
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline mb-4 leading-relaxed">{t("footer.tagline")}</p>
            <div className="flex items-center gap-2 text-secondary font-label-numeric-sm text-label-numeric-sm">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{t("footer.iso")}</span>
            </div>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.escrow")}</h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-outline">
              {FEATURES.map((item) => (
                <li key={item.labelKey}>
                  <a
                    className="hover:text-on-surface transition-colors"
                    href={`${REPOSITORY_URL}#${item.anchor}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {t(item.labelKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.grading")}</h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-outline">
              {GRADING_LABELS.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.settlement")}</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method.labelKey}
                  className={`px-2 py-1 rounded bg-surface-container font-label-numeric-sm text-label-numeric-sm border border-outline-variant/30 ${
                    method.supported ? "text-on-surface" : "text-outline line-through decoration-outline/60"
                  }`}
                >
                  {t(method.labelKey)}
                </span>
              ))}
            </div>
            <p className="font-body-sm text-body-sm text-outline">{t("footer.settlementNote")}</p>
          </div>
        </div>

        {/* 실제 사업자가 아니므로 사업자 정보 대신 데모 고지 */}
        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-outline font-body-sm text-body-sm">
          <div>
            <p className="mb-1 text-on-surface-variant font-semibold">{t("footer.company")}</p>
            <p>{t("footer.legalNote")}</p>
          </div>
          <div className="flex flex-wrap gap-4 shrink-0">
            <a className="flex items-center gap-1 whitespace-nowrap hover:text-on-surface transition-colors" href={REPOSITORY_URL} rel="noreferrer" target="_blank">
              <span className="material-symbols-outlined text-[16px]">code</span>
              {t("footer.source")}
            </a>
            {LEGAL_LINKS.map((item) => (
              <Link key={item.labelKey} className="whitespace-nowrap hover:text-on-surface transition-colors" href={routes.section(item.section)}>
                {t(item.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
