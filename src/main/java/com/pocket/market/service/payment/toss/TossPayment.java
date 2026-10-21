package com.pocket.market.service.payment.toss;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;

/**
 * 토스페이먼츠 Payment 객체 중 이 데모가 쓰는 필드만 매핑한다.
 * https://docs.tosspayments.com/reference#payment-객체
 *
 * @param status      READY, WAITING_FOR_DEPOSIT, DONE, CANCELED, PARTIAL_CANCELED ...
 * @param secret      가상계좌 웹훅 검증 값. 입금 콜백의 secret 과 같아야 정상 요청이다.
 * @param totalAmount 최초 결제 금액
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TossPayment(
        String paymentKey,
        String orderId,
        String status,
        String secret,
        Long totalAmount,
        OffsetDateTime approvedAt,
        VirtualAccount virtualAccount
) {

    public static final String STATUS_DONE = "DONE";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VirtualAccount(
            String accountNumber,
            String bankCode,
            String customerName,
            String dueDate
    ) {
    }

    /** secret 이 로그에 남지 않도록 기본 record toString 을 대체한다. */
    @Override
    public String toString() {
        return "TossPayment[orderId=%s, status=%s, totalAmount=%s]".formatted(orderId, status, totalAmount);
    }
}
