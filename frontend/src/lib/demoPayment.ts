// 데모(오프라인) 모드 결제 시뮬레이션.
// 백엔드가 없을 때도 결제 흐름을 시연할 수 있도록, 백엔드 OrderResponse 와 같은 형태의 주문을 브라우저에서 만든다.
// 실제 재고 선점·금액 검증·웹훅 처리는 하지 않는다 (백엔드 연결 시에는 사용되지 않음).

import type { BackendBankCode, OrderResponse } from "@/lib/api/backend";

const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;
const ISSUE_DELAY_MS = 600;

const randomDigits = (length: number) => {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v, i) => (i === 0 ? (v % 9) + 1 : v % 10)).join("");
};

const randomHex = (length: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(length)), (v) => (v % 16).toString(16))
    .join("")
    .toUpperCase();

/** 백엔드 LocalDateTime 과 같은 형식(타임존 없음, Asia/Seoul 기준) */
function toServerDateTime(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace("Z", "").slice(0, 19);
}

type DemoOrderInput = {
  listingId: number;
  amount: number;
  buyerId: number;
  bank: BackendBankCode;
  depositorName: string;
};

/** 가상계좌 발급 시뮬레이션 (12~14자리 계좌번호, 24시간 입금 기한) */
export async function createDemoOrder({ listingId, amount, buyerId, bank, depositorName }: DemoOrderInput): Promise<OrderResponse> {
  await new Promise((resolve) => setTimeout(resolve, ISSUE_DELAY_MS));
  const now = new Date();
  const digits = 12 + (crypto.getRandomValues(new Uint8Array(1))[0] % 3);
  return {
    orderId: -Date.now(),
    orderNo: `DEMO-${randomHex(16)}`,
    buyerId,
    listingId,
    amount,
    status: "PENDING_PAYMENT",
    virtualAccount: { bankCode: bank, bankName: null, accountNumber: randomDigits(digits), depositorName: depositorName.trim() || "DEMO" },
    paymentDueAt: toServerDateTime(new Date(now.getTime() + PAYMENT_WINDOW_MS)),
    paidAt: null,
    pgTransactionId: null,
    createdAt: toServerDateTime(now),
  };
}

/** 입금 완료 웹훅 수신 시뮬레이션 */
export async function confirmDemoDeposit(order: OrderResponse): Promise<OrderResponse> {
  return {
    ...order,
    status: "PAID",
    paidAt: toServerDateTime(new Date()),
    pgTransactionId: `pg_tx_demo_${randomHex(12).toLowerCase()}`,
  };
}
