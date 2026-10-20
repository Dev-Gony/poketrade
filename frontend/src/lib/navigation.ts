import type { TranslationKey } from "@/i18n/dictionaries";

/**
 * 아직 화면이 없는 메뉴. /[section] 라우트가 공통 레이아웃 안에서 "준비 중" 페이지로 렌더한다.
 * 헤더 메뉴, 프로필 메뉴, 푸터 링크가 모두 여기 정의된 경로만 사용한다.
 */
export const SECTIONS = {
  auctions: { labelKey: "nav.liveAuctions", icon: "gavel" },
  "price-guide": { labelKey: "nav.priceGuide", icon: "query_stats" },
  sell: { labelKey: "nav.sell", icon: "sell" },
  "vault-escrow": { labelKey: "nav.vaultEscrow", icon: "lock" },
  "my-vault": { labelKey: "nav.myVault", icon: "inventory_2" },
  trades: { labelKey: "nav.trades", icon: "receipt_long" },
  terms: { labelKey: "footer.terms", icon: "description" },
  privacy: { labelKey: "footer.privacy", icon: "shield_person" },
  "escrow-terms": { labelKey: "footer.escrowTerms", icon: "verified_user" },
} as const satisfies Record<string, { labelKey: TranslationKey; icon: string }>;

export type SectionSlug = keyof typeof SECTIONS;
export const SECTION_SLUGS = Object.keys(SECTIONS) as SectionSlug[];

export const routes = {
  marketplace: "/",
  card: (id: string) => `/cards/${id}`,
  checkout: (id: string) => `/cards/${id}/checkout`,
  section: (slug: SectionSlug) => `/${slug}`,
};

export type NavItem = {
  key: "marketplace" | SectionSlug;
  labelKey: TranslationKey;
  href: string;
};

const navSection = (slug: SectionSlug): NavItem => ({ key: slug, labelKey: SECTIONS[slug].labelKey, href: routes.section(slug) });

export const NAV_ITEMS: NavItem[] = [
  { key: "marketplace", labelKey: "nav.marketplace", href: routes.marketplace },
  navSection("auctions"),
  navSection("price-guide"),
  navSection("sell"),
  navSection("vault-escrow"),
];

/** 카드 상세/결제 화면은 마켓플레이스 메뉴 하위로 본다. */
export function activeNavKey(pathname: string): NavItem["key"] | null {
  if (pathname === "/" || pathname.startsWith("/cards")) return "marketplace";
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.key ?? null;
}
