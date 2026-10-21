package com.pocket.market.domain.payment;

public enum WebhookInboxResult {
    /** 수신 기록만 남고 처리 결과가 아직 없음. 오래 남아 있으면 처리 도중 중단된 건이다. */
    RECEIVED,
    /** 이번 수신으로 결제 완료 처리됨 */
    PROCESSED,
    /** 이미 같은 거래로 처리된 중복 수신 */
    ALREADY_PROCESSED,
    /** 처리 대상이 아닌 상태 통보 (DONE 이 아님) */
    IGNORED,
    /** 결제할 수 없는 주문에 입금되어 환불 대상으로 기록함 */
    REFUND_REQUIRED,
    /** 인증 실패·금액 불일치·주문 없음 등으로 거부 (주문 상태 변경은 롤백) */
    REJECTED
}
