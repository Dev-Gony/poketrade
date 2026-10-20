// 알림 팝오버 목업 데이터. 백엔드 연동 시 GET /api/notifications 응답으로 대체한다.

import type { LocalizedText } from "@/i18n/dictionaries";

export type MockNotification =
  | { id: string; kind: "sold"; card: LocalizedText; krw: number; minutesAgo: number }
  | { id: string; kind: "offer"; card: LocalizedText; krw: number; minutesAgo: number }
  | { id: string; kind: "priceDrop"; card: LocalizedText; pct: number; minutesAgo: number };

export const MOCK_NOTIFICATIONS: MockNotification[] = [
  { id: "n1", kind: "sold", card: { ko: "블래키 VMAX PSA 10", en: "Umbreon VMAX PSA 10", ja: "ブラッキーVMAX PSA 10" }, krw: 1_890_000, minutesAgo: 2 },
  { id: "n2", kind: "offer", card: { ko: "레쿠쟈 VMAX", en: "Rayquaza VMAX", ja: "レックウザVMAX" }, krw: 1_740_000, minutesAgo: 18 },
  { id: "n3", kind: "priceDrop", card: { ko: "팬텀 VMAX", en: "Gengar VMAX", ja: "ゲンガーVMAX" }, pct: 3.4, minutesAgo: 95 },
];
