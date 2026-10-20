"use client";

import Link from "next/link";
import type { TranslationKey } from "@/i18n/dictionaries";
import { useTranslation } from "@/i18n/I18nProvider";
import { routes, type SectionSlug } from "@/lib/navigation";

const GRADING_PARTNERS: { labelKey: TranslationKey; dot: string }[] = [
  { labelKey: "footer.psa", dot: "bg-error" },
  { labelKey: "footer.bgs", dot: "bg-secondary" },
  { labelKey: "footer.cgc", dot: "bg-tertiary" },
  { labelKey: "footer.ars", dot: "bg-primary" },
];

const ESCROW_LINKS: { labelKey: TranslationKey; section: SectionSlug }[] = [
  { labelKey: "footer.vaultStorage", section: "vault-escrow" },
  { labelKey: "footer.freight", section: "vault-escrow" },
  { labelKey: "footer.multisig", section: "vault-escrow" },
  { labelKey: "footer.counterfeit", section: "escrow-terms" },
];

/** 제휴사 고유명은 번역하지 않는다. */
const SETTLEMENT_PARTNERS = ["Toss Payments", "KG Inicis", "KB Kookmin Escrow", "Stripe USD"];

const LEGAL_LINKS: { labelKey: TranslationKey; section: SectionSlug }[] = [
  { labelKey: "footer.terms", section: "terms" },
  { labelKey: "footer.privacy", section: "privacy" },
  { labelKey: "footer.escrowTerms", section: "escrow-terms" },
];

const COMPANY = {
  ceo: "홍길동",
  bizNo: "214-88-99012",
  mailOrderNo: "제2024-서울강남-04192호",
  phone: "1588-9042",
};

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
                Vault
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline mb-4 leading-relaxed">{t("footer.tagline")}</p>
            <div className="flex items-center gap-2 text-tertiary font-label-numeric-sm text-label-numeric-sm">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>{t("footer.iso")}</span>
            </div>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.grading")}</h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-outline">
              {GRADING_PARTNERS.map((item) => (
                <li key={item.labelKey} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                  {t(item.labelKey)}
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.escrow")}</h4>
            <ul className="space-y-2 font-body-sm text-body-sm text-outline">
              {ESCROW_LINKS.map((item) => (
                <li key={item.labelKey}>
                  <Link className="hover:text-on-surface transition-colors" href={routes.section(item.section)}>
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1">
            <h4 className="font-label-caps text-label-caps uppercase text-on-surface mb-3">{t("footer.settlement")}</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              {SETTLEMENT_PARTNERS.map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 rounded bg-surface-container font-label-numeric-sm text-label-numeric-sm text-on-surface border border-outline-variant/30"
                >
                  {label}
                </span>
              ))}
            </div>
            <p className="font-body-sm text-body-sm text-outline">{t("footer.settlementNote")}</p>
          </div>
        </div>

        {/* Legal notice */}
        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-outline font-body-sm text-body-sm">
          <div>
            <p className="mb-1">
              {[
                t("footer.company"),
                t("footer.ceo", { name: COMPANY.ceo }),
                t("footer.bizNo", { no: COMPANY.bizNo }),
                t("footer.mailOrder", { no: COMPANY.mailOrderNo }),
              ].join(" | ")}
            </p>
            <p>
              {t("footer.address")} | {t("footer.support", { phone: COMPANY.phone })}
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
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
