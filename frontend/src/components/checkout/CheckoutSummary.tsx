"use client";

import { useState } from "react";
import type { TranslationKey } from "@/i18n/dictionaries";
import { useTranslation } from "@/i18n/I18nProvider";
import { GRADE_STYLES, gradeText, type CardData } from "@/lib/cards";
import type { CheckoutData } from "@/lib/checkout";

type Fulfillment = "shipping" | "vault";

const SELECTED_OPTION = "bg-surface-container-high shadow-sm ring-1 ring-primary/40";
const IDLE_OPTION = "bg-surface-container hover:bg-surface-container-high/60";

const ESCROW_STEPS: { icon: string; tone: "tertiary" | "secondary"; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  { icon: "check", tone: "tertiary", titleKey: "co.step1Title", bodyKey: "co.step1Body" },
  { icon: "check", tone: "tertiary", titleKey: "co.step2Title", bodyKey: "co.step2Body" },
  { icon: "schedule", tone: "secondary", titleKey: "co.step3Title", bodyKey: "co.step3Body" },
];

export default function CheckoutSummary({ card, data }: { card: CardData; data: CheckoutData }) {
  const { t, pick } = useTranslation();
  const [fulfillment, setFulfillment] = useState<Fulfillment>("shipping");
  const { shipping } = data;
  const grade = GRADE_STYLES[card.grade.company];

  return (
    <div className="lg:col-span-5 bg-surface-container-low/70 p-6 md:p-8 flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        {/* Graded Slab Mini-Preview */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">{t("co.assetInCustody")}</span>
            <span className="shrink-0 px-2 py-0.5 rounded font-label-numeric-sm text-label-numeric-sm bg-tertiary/10 text-tertiary font-medium">
              {t("co.vaultLot", { lot: card.vaultBox })}
            </span>
          </div>
          <div className="bg-surface-container rounded-xl p-3.5 shadow-lg relative group">
            <div className="flex gap-4 items-center">
              <div className="relative w-24 h-32 rounded-lg bg-surface-container-lowest overflow-hidden shrink-0 shadow-md">
                <img alt={card.name.en} className="w-full h-full object-cover rounded" src={card.imageUrl} />
                <div className="absolute top-0 left-0 right-0 h-4 bg-surface-container-lowest/90 flex items-center justify-between px-1 text-[8px] font-label-numeric-sm font-bold tracking-tight">
                  <span className={grade.text}>{card.grade.company}</span>
                  <span className="text-on-surface">
                    {card.grade.score} {card.grade.label}
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-on-surface/10 to-transparent pointer-events-none" />
              </div>
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-label-caps text-label-caps font-bold uppercase ${grade.badge}`}>
                    {gradeText(card)}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-label-caps text-label-caps bg-surface-container-highest text-on-surface-variant uppercase">
                    #{card.cardNumber}
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">{pick(card.name)}</h3>
                <p className="font-body-sm text-body-sm text-outline truncate mb-1">
                  {card.setName} • {card.rarity}
                </p>
                <div className="flex items-center gap-1.5 text-on-surface-variant font-label-numeric-sm text-label-numeric-sm">
                  <span className="text-outline text-xs">{t("co.cert")}</span>
                  <span className="text-tertiary font-semibold tracking-wide">#{card.certNumber}</span>
                  <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fulfillment Method Selector */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="font-label-caps text-label-caps uppercase text-outline tracking-wider">{t("co.fulfillmentTitle")}</span>
            <span className="shrink-0 font-label-numeric-sm text-label-numeric-sm text-secondary">{t("co.insuranceIncluded")}</span>
          </div>
          <div className="space-y-3" role="radiogroup">
            <label className={`cursor-pointer block rounded-xl p-4 transition-all duration-200 ${fulfillment === "shipping" ? SELECTED_OPTION : IDLE_OPTION}`}>
              <div className="flex items-start gap-3">
                <input
                  checked={fulfillment === "shipping"}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                  name="fulfillment_option"
                  onChange={() => setFulfillment("shipping")}
                  type="radio"
                  value="shipping"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline-sm text-[15px] font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                      {t("co.shipTitle")}
                    </span>
                    <span className="shrink-0 font-label-numeric-sm text-label-numeric-sm text-tertiary font-semibold">{t("co.shipBadge")}</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline mt-0.5">{t("co.shipDesc")}</p>
                  {fulfillment === "shipping" && (
                    <div className="mt-3 p-3 bg-surface-container-lowest/80 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-label-caps text-[10px] text-primary font-bold uppercase">{t("co.destination")}</span>
                        <button
                          className="font-label-numeric-sm text-label-numeric-sm text-outline hover:text-on-surface transition-colors flex items-center gap-0.5"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> {t("co.edit")}
                        </button>
                      </div>
                      <p className="font-body-md text-body-md font-semibold text-on-surface">
                        {shipping.recipient}{" "}
                        <span className="font-label-numeric-sm text-label-numeric-sm font-normal text-on-surface-variant ml-1">{shipping.phone}</span>
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">{shipping.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </label>

            <label className={`cursor-pointer block rounded-xl p-4 transition-all duration-200 ${fulfillment === "vault" ? SELECTED_OPTION : IDLE_OPTION}`}>
              <div className="flex items-start gap-3">
                <input
                  checked={fulfillment === "vault"}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                  name="fulfillment_option"
                  onChange={() => setFulfillment("vault")}
                  type="radio"
                  value="vault"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline-sm text-[15px] font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-secondary">lock</span>
                      {t("co.vaultTitle")}
                    </span>
                    <span className="shrink-0 font-label-caps text-[10px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary uppercase font-bold">
                      {t("co.vaultBadge")}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-outline mt-0.5">{t("co.vaultDesc")}</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Escrow Protection Breakdown */}
        <div className="bg-surface-container/60 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified_user</span>
            <span className="font-label-caps text-label-caps uppercase text-on-surface font-bold">{t("co.escrowProtocol")}</span>
          </div>
          <ul className="space-y-2.5 font-body-sm text-body-sm">
            {ESCROW_STEPS.map((step) => (
              <li key={step.titleKey} className="flex items-start gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full ${step.tone === "tertiary" ? "bg-tertiary/20" : "bg-secondary/20"} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <span className={`material-symbols-outlined ${step.tone === "tertiary" ? "text-tertiary" : "text-secondary"} text-[12px] font-bold`}>
                    {step.icon}
                  </span>
                </div>
                <span className="text-on-surface-variant">
                  <strong className="text-on-surface">{t(step.titleKey)}</strong> {t(step.bodyKey)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Trust Badges */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-2 text-outline text-[11px] font-label-numeric-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">health_and_safety</span> {t("co.iso")}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">inventory_2</span> {t("co.tamperTape")}
        </span>
      </div>
    </div>
  );
}
