package com.pocket.market.domain.payment;

public enum RefundReason {
    /** 입금 기한이 지나 만료된 주문에 입금됨 */
    ORDER_EXPIRED,
    /** 구매자가 취소한 주문에 입금됨 */
    ORDER_CANCELLED,
    /** 이미 다른 거래로 결제 완료된 주문에 또 입금됨 (이중 입금) */
    ALREADY_PAID
}
