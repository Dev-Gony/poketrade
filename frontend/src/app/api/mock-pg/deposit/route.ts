import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BackendError, serverApi, type OrderResponse, type WebhookResponse } from "@/lib/api/backend";

const WEBHOOK_SECRET = process.env.BACKEND_WEBHOOK_SECRET ?? "local-webhook-secret";

/**
 * 시연용 모의 PG. 브라우저의 [모의 입금 완료] 요청을 받아, 실제 PG 가 보내는 것과 같은 입금 완료 웹훅을
 * Spring 백엔드(POST /api/webhooks/payments/virtual-account)로 전송한다.
 * 웹훅 시크릿은 서버에만 두기 위해 브라우저가 백엔드 웹훅을 직접 호출하지 않고 이 라우트를 거친다.
 * 금액 검증·중복 수신 방지·주문/매물 상태 전이는 모두 백엔드가 처리한다.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === "number" && Number.isInteger(body.orderId) ? body.orderId : null;
  if (orderId === null) return NextResponse.json({ code: "C001", message: "orderId is required" }, { status: 400 });

  try {
    // PG 는 주문번호·금액을 자기 기록 기준으로 보내므로, 발급된 주문을 백엔드에서 다시 읽어 페이로드를 만든다.
    const order = await serverApi<OrderResponse>(`/orders/${orderId}`);
    const webhook = await serverApi<WebhookResponse>("/webhooks/payments/virtual-account", {
      method: "POST",
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      body: {
        transactionId: `pg_tx_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
        orderNo: order.orderNo,
        status: "DONE",
        amount: order.amount,
        depositorName: order.virtualAccount.depositorName,
      },
    });
    const updated = await serverApi<OrderResponse>(`/orders/${orderId}`);
    return NextResponse.json({ result: webhook.result, order: updated });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: error.status || 502 });
    }
    throw error;
  }
}
