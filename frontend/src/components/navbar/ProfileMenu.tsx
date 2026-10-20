"use client";

import Link from "next/link";
import { useCurrency } from "@/currency/CurrencyProvider";
import { usePopover } from "@/hooks/usePopover";
import { useTranslation } from "@/i18n/I18nProvider";
import { routes } from "@/lib/navigation";
import { useSession } from "@/session/SessionProvider";
import { MENU_ITEM, POPOVER_PANEL } from "./styles";

export default function ProfileMenu() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { user, login, logout } = useSession();
  const { open, toggle, close, ref } = usePopover();

  if (!user) {
    return (
      <button
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-semibold hover:brightness-110 transition-all"
        onClick={login}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">login</span>
        <span className="whitespace-nowrap">{t("profile.login")}</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative shrink-0 pl-space-sm border-l border-outline-variant/30">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("header.account")}
        className="flex items-center gap-2 rounded-lg p-0.5 hover:bg-surface-container transition-colors"
        onClick={toggle}
        type="button"
      >
        <img alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40" src={user.avatarUrl} />
        {/* 메뉴가 펼쳐지는 xl 이상에서는 폭이 모자라 아바타만 보이고, 이름/잔액은 드롭다운 상단에 표시 */}
        <span className="hidden sm:flex flex-col text-left xl:hidden">
          <span className="flex items-center gap-1">
            <span className="whitespace-nowrap font-body-md text-body-md font-semibold text-on-surface leading-tight">{user.nickname}</span>
            <span className="material-symbols-outlined text-[15px] text-tertiary">verified</span>
          </span>
          <span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-semibold leading-tight">
            {format(user.balanceKrw)}
          </span>
        </span>
        <span className={`material-symbols-outlined text-[18px] text-outline transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
      </button>

      {open && (
        <div className={`${POPOVER_PANEL} w-60`} role="menu">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/30">
            <img alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/40" src={user.avatarUrl} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate font-body-md text-body-md font-semibold text-on-surface">{user.nickname}</span>
                <span className="material-symbols-outlined text-[15px] text-tertiary">verified</span>
              </div>
              <span className="block font-label-numeric-sm text-label-numeric-sm text-outline">{t("profile.verified")}</span>
            </div>
          </div>
          <div className="px-4 py-2.5 border-b border-outline-variant/30 flex items-center justify-between">
            <span className="font-label-caps text-label-caps uppercase text-outline">{t("profile.balance")}</span>
            <span className="font-label-numeric-md text-label-numeric-md font-bold text-secondary">{format(user.balanceKrw)}</span>
          </div>
          <div className="p-1">
            <Link className={MENU_ITEM} href={routes.section("my-vault")} onClick={close} role="menuitem">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              {t("profile.myVault")}
            </Link>
            <Link className={MENU_ITEM} href={routes.section("trades")} onClick={close} role="menuitem">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              {t("profile.trades")}
            </Link>
            <button
              className={`${MENU_ITEM} hover:!text-error`}
              onClick={() => {
                close();
                logout();
              }}
              role="menuitem"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {t("profile.logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
