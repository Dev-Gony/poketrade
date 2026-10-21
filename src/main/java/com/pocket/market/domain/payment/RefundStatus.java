package com.pocket.market.domain.payment;

public enum RefundStatus {
    /** 환불 필요. PG 가 모의 구현이라 실제 환불 호출은 하지 않고 운영자 확인 대상으로만 남긴다. */
    REFUND_REQUIRED
}
