package com.pocket.market.dto.webhook;

public record WebhookResponse(Result result, String orderNo) {

    public enum Result {
        /** 이번 요청으로 결제 완료 처리됨 */
        PROCESSED,
        /** 이미 동일 거래로 처리된 중복 수신 (멱등 응답) */
        ALREADY_PROCESSED,
        /** 처리 대상이 아닌 상태 통보 */
        IGNORED,
        /** 결제할 수 없는 주문(만료·취소·다른 거래로 결제 완료)에 돈이 들어와 환불 대상으로 기록함 */
        REFUND_REQUIRED
    }

    public static WebhookResponse of(Result result, String orderNo) {
        return new WebhookResponse(result, orderNo);
    }
}
