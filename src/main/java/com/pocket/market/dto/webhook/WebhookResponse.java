package com.pocket.market.dto.webhook;

public record WebhookResponse(Result result, String orderNo) {

    public enum Result {
        /** 이번 요청으로 결제 완료 처리됨 */
        PROCESSED,
        /** 이미 동일 거래로 처리된 중복 수신 (멱등 응답) */
        ALREADY_PROCESSED,
        /** 처리 대상이 아닌 상태 통보 */
        IGNORED
    }

    public static WebhookResponse of(Result result, String orderNo) {
        return new WebhookResponse(result, orderNo);
    }
}
