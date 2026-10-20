package com.pocket.market.domain.order;

public enum OrderStatus {
    /** 가상계좌 발급, 입금 대기 */
    PENDING_PAYMENT,
    /** 입금 확인 완료 */
    PAID,
    /** 입금 기한 만료로 취소 */
    EXPIRED
}
