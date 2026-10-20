"use client";

import { useState } from "react";
import { useCurrency } from "@/currency/CurrencyProvider";
import { usePopover } from "@/hooks/usePopover";
import { formatMinutesAgo } from "@/i18n/format";
import { useTranslation } from "@/i18n/I18nProvider";
import { MOCK_NOTIFICATIONS, type MockNotification } from "@/lib/notifications";
import { ICON_BUTTON, POPOVER_PANEL } from "./styles";

const KIND_ICON: Record<MockNotification["kind"], { icon: string; tone: string }> = {
  sold: { icon: "sell", tone: "text-secondary bg-secondary/15" },
  offer: { icon: "gavel", tone: "text-primary bg-primary/15" },
  priceDrop: { icon: "trending_down", tone: "text-tertiary bg-tertiary/15" },
};

export default function NotificationsMenu() {
  const { t, intlLocale, pick } = useTranslation();
  const { format } = useCurrency();
  const { open, toggle, ref } = usePopover();
  const [items, setItems] = useState(MOCK_NOTIFICATIONS);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  const unreadCount = items.filter((n) => !readIds.has(n.id)).length;

  const message = (n: MockNotification) => {
    const card = pick(n.card);
    switch (n.kind) {
      case "sold":
        return t("notif.sold", { card, price: format(n.krw) });
      case "offer":
        return t("notif.offer", { card, price: format(n.krw) });
      case "priceDrop":
        return t("notif.priceDrop", { card, pct: `${n.pct}%` });
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button aria-expanded={open} aria-haspopup="dialog" aria-label={t("header.notifications")} className={ICON_BUTTON} onClick={toggle} type="button">
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
        )}
      </button>

      {open && (
        <div aria-label={t("notif.title")} className={`${POPOVER_PANEL} w-80`} role="dialog">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
            <span className="font-headline-sm text-body-md font-bold text-on-surface">{t("notif.title")}</span>
            {items.length > 0 && (
              <div className="flex items-center gap-3 font-label-numeric-sm text-label-numeric-sm">
                <button
                  className="text-primary hover:underline disabled:text-outline disabled:no-underline"
                  disabled={unreadCount === 0}
                  onClick={() => setReadIds(new Set(items.map((n) => n.id)))}
                  type="button"
                >
                  {t("notif.markAllRead")}
                </button>
                <button className="text-outline hover:text-on-surface" onClick={() => setItems([])} type="button">
                  {t("notif.clearAll")}
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-outline">notifications_off</span>
              <p className="font-body-md text-body-md text-on-surface-variant">{t("notif.empty")}</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1">
              {items.map((n) => {
                const unread = !readIds.has(n.id);
                const { icon, tone } = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-container transition-colors"
                      onClick={() => setReadIds((prev) => new Set(prev).add(n.id))}
                      type="button"
                    >
                      <span className={`material-symbols-outlined shrink-0 rounded-lg p-1.5 text-[18px] ${tone}`}>{icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className={`block font-body-sm text-body-sm ${unread ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                          {message(n)}
                        </span>
                        <span className="block mt-0.5 font-label-numeric-sm text-label-numeric-sm text-outline">
                          {formatMinutesAgo(intlLocale, n.minutesAgo)}
                        </span>
                      </span>
                      {unread && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
