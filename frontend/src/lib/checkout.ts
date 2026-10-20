// 에스크로 결제 화면 공통 데이터(배송지·수수료·은행 목록). 상품·금액은 백엔드 매물(GET /api/listings) 값을 쓴다.
// 금액은 KRW 정수로 보관하고 화면에서 선택 통화로 환산한다. 실제 청구는 항상 KRW.

import type { TranslationKey } from "@/i18n/dictionaries";
import type { BackendBankCode } from "@/lib/api/backend";

/** 백엔드 VirtualAccountBank enum 이름과 동일 */
export type BankCode = BackendBankCode;

export const BANKS: { code: BankCode; labelKey: TranslationKey }[] = [
  { code: "KB", labelKey: "bank.kb" },
  { code: "SHINHAN", labelKey: "bank.shinhan" },
  { code: "TOSS", labelKey: "bank.toss" },
  { code: "WOORI", labelKey: "bank.woori" },
  { code: "HANA", labelKey: "bank.hana" },
];

export const bankLabelKey = (code: BankCode | null | undefined) => BANKS.find((b) => b.code === code)?.labelKey ?? "bank.kb";

export const CHECKOUT = {
  guaranteeId: "KR-9942",
  txId: "PKT-2024-84920",
  /** 사용자 입력 데이터라 번역 대상이 아님 */
  shipping: {
    recipient: "홍길동",
    phone: "010-9876-5432",
    address: "서울특별시 강남구 테헤란로 152 강남파이낸스센터 18층",
  },
  shippingOriginalKrw: 15_000,
  shippingKrw: 0,
  inspectionFeeKrw: 0,
} as const;

export type CheckoutData = typeof CHECKOUT;

/** 가상계좌번호 가독성용 하이픈 구분 (예: 123-456-78901234) */
export const formatAccountNumber = (digits: string) => `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
