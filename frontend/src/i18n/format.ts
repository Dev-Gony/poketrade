// 언어별 날짜·상대시간 포맷 헬퍼. intlLocale 은 useTranslation().intlLocale 값을 넘긴다.

export function formatRelative(intlLocale: string, value: number, unit: Intl.RelativeTimeFormatUnit) {
  return new Intl.RelativeTimeFormat(intlLocale, { numeric: "auto" }).format(value, unit);
}

/** 분 단위 경과 시간을 가장 자연스러운 단위로 ("2분 전", "1 hour ago") */
export function formatMinutesAgo(intlLocale: string, minutes: number) {
  if (minutes < 60) return formatRelative(intlLocale, -minutes, "minute");
  if (minutes < 60 * 24) return formatRelative(intlLocale, -Math.floor(minutes / 60), "hour");
  return formatRelative(intlLocale, -Math.floor(minutes / (60 * 24)), "day");
}

/** ISO 일시 → 언어별 날짜+시각 (예: 2026. 10. 21. 오후 3:20) */
export function formatDateTime(intlLocale: string, iso: string) {
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** "YYYY-MM" → "2022년 3월" / "March 2022" / "2022年3月" */
export function formatYearMonth(intlLocale: string, yearMonth: string, style: "long" | "short" = "long") {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(intlLocale, {
    year: style === "long" ? "numeric" : "2-digit",
    month: style === "long" ? "long" : "short",
    timeZone: "UTC",
  }).format(date);
}
