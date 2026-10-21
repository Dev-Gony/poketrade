package com.pocket.market.service.payment.toss;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * POST /v1/virtual-accounts 요청 본문.
 * https://docs.tosspayments.com/reference#가상계좌-발급-요청
 *
 * @param orderId    가맹점 주문번호 (6~64자, 영문·숫자·-·_)
 * @param bank       발급 은행 두 자리 코드 (TossBankCode)
 * @param validHours 입금 유효 시간 (최대 2160)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TossVirtualAccountRequest(
        long amount,
        String orderId,
        String orderName,
        String customerName,
        String bank,
        Integer validHours
) {
}
