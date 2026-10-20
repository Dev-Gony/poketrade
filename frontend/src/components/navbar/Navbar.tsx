"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useTranslation } from "@/i18n/I18nProvider";
import { activeNavKey, NAV_ITEMS, routes } from "@/lib/navigation";
import CurrencyToggle from "./CurrencyToggle";
import LanguageMenu from "./LanguageMenu";
import LiveTradesTicker from "./LiveTradesTicker";
import NotificationsMenu from "./NotificationsMenu";
import ProfileMenu from "./ProfileMenu";

export default function Navbar() {
  const pathname = usePathname();
  const activeKey = activeNavKey(pathname);
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
      <div className="h-20 max-w-7xl mx-auto px-margin flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <Link className="flex items-center gap-space-sm shrink-0" href={routes.marketplace}>
            <img
              alt="PokeTrade Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_jD9ZsGhsLLY48jl7io622tnFdwGTGQxKFLsiAR4ZUvviVM01-1ZVhvsraYrIupTJMcHzqeS3k8EIMhV_9wU6JTiIobB74BGQCxp3DhrqOp-hpRsr-yQB_zzk2CdVhqXCwTt5Njs2ucEL0K9ha5z1MPCmI7wVh5jt5TgDiNQO21f8dd0ZLP1yL6aRkahzHLlxtOVH5ZS2np3QPnN_Mz1xhlTqvnKRSHoUo4zp6HWkHyKd2R4Qt_YF9w"
            />
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface font-bold">POKETRADE</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-label-caps text-label-caps uppercase bg-primary-container/20 text-primary border border-primary/40 tracking-wider">
                VAULT
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.key === activeKey;
              return (
                <Link
                  key={item.key}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg transition-all bg-surface-container-high text-primary border-b-2 border-primary font-semibold"
                      : "whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 transition-all"
                  }
                  href={item.href}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <CurrencyToggle />
            <LanguageMenu />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationsMenu />
            <ThemeToggle />
          </div>
          <ProfileMenu />
        </div>
      </div>

      <LiveTradesTicker />
    </header>
  );
}
