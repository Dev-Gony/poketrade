"use client";

import { CURRENCIES, useCurrency } from "@/currency/CurrencyProvider";
import { useTranslation } from "@/i18n/I18nProvider";

export default function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useTranslation();

  return (
    <div
      aria-label={t("header.currency")}
      className="hidden md:flex shrink-0 items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/40"
      role="radiogroup"
    >
      {CURRENCIES.map((code) => {
        const active = currency === code;
        return (
          <button
            key={code}
            aria-checked={active}
            className={`whitespace-nowrap px-2 py-0.5 rounded font-label-numeric-sm text-label-numeric-sm transition-colors ${
              active ? "bg-surface-container-high text-primary font-semibold shadow-sm" : "text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setCurrency(code)}
            role="radio"
            type="button"
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
