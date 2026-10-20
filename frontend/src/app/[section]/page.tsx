import Link from "next/link";
import { notFound } from "next/navigation";
import { T } from "@/i18n/I18nProvider";
import { routes, SECTION_SLUGS, SECTIONS, type SectionSlug } from "@/lib/navigation";

type PageProps = {
  params: { section: string };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTION_SLUGS.map((section) => ({ section }));
}

const isSection = (value: string): value is SectionSlug => value in SECTIONS;

/**
 * 아직 화면이 없는 메뉴의 준비 중 페이지.
 * Navbar/Footer 와 언어·통화·테마 상태는 루트 레이아웃이 담당하므로 여기서는 본문만 그린다.
 */
export default function SectionPage({ params }: PageProps) {
  if (!isSection(params.section)) notFound();
  const section = SECTIONS[params.section];

  return (
    <div className="max-w-7xl mx-auto px-margin py-24 w-full flex flex-col items-center text-center gap-space-md">
      <div className="w-16 h-16 rounded-2xl bg-primary-container/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px] text-primary">{section.icon}</span>
      </div>
      <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
        <T k={section.labelKey} />
      </h1>
      <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-container/20 font-label-caps text-label-caps uppercase text-tertiary">
        <span className="material-symbols-outlined text-[14px]">construction</span>
        <T k="section.comingSoon" />
      </p>
      <p className="font-body-md text-body-md text-outline max-w-md">
        <T k="section.comingSoonBody" />
      </p>
      <Link
        className="mt-space-sm px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-body-md font-bold hover:brightness-110 transition-all shadow-md flex items-center gap-1.5"
        href={routes.marketplace}
      >
        <span className="material-symbols-outlined text-[18px]">storefront</span>
        <T k="section.back" />
      </Link>
    </div>
  );
}
