package com.pocket.market.domain.listing;

public enum ListingStatus {
    /** 판매중 */
    ON_SALE,
    /** 주문 생성되어 입금 대기 중(재고 선점) */
    RESERVED,
    /** 판매 완료 */
    SOLD
}
