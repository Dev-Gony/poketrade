package com.pocket.market.service.payment.toss;

import com.pocket.market.config.AppProperties;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.service.payment.VirtualAccountBank;
import com.pocket.market.service.payment.VirtualAccountIssuer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 토스페이먼츠 테스트 모드 가상계좌 발급기 (app.payment.provider=toss).
 * 테스트 키로 발급된 계좌는 번호 앞에 'X' 가 붙고 실제 입금이 불가능하다.
 * 입금은 개발자센터 테스트 결제내역의 [입금 처리] 로 흉내 내며, 그 결과가 DEPOSIT_CALLBACK 웹훅으로 들어온다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "toss")
@RequiredArgsConstructor
public class TossVirtualAccountIssuer implements VirtualAccountIssuer {

    /** 토스 결제창·내역에 표시되는 상품명. 데모임을 분명히 한다. */
    static final String ORDER_NAME = "PokeTrade 데모 주문 (테스트 결제)";
    private static final int MAX_VALID_HOURS = 2160;

    private final TossPaymentsClient tossPaymentsClient;
    private final AppProperties appProperties;

    @Override
    public IssuedVirtualAccount issue(String orderNo, long amount, String depositorName, VirtualAccountBank bank) {
        int validHours = (int) Math.max(1, Math.min(appProperties.getPaymentDueHours(), MAX_VALID_HOURS));
        TossPayment payment = tossPaymentsClient.issueVirtualAccount(new TossVirtualAccountRequest(
                amount, orderNo, ORDER_NAME, depositorName, TossBankCode.codeOf(bank), validHours));

        if (payment == null || payment.virtualAccount() == null
                || payment.virtualAccount().accountNumber() == null || payment.virtualAccount().accountNumber().isBlank()) {
            throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_ERROR, "토스페이먼츠 응답에 가상계좌 정보가 없습니다.");
        }
        VirtualAccountBank issuedBank = TossBankCode.bankOf(payment.virtualAccount().bankCode()).orElse(bank);
        log.info("[Toss] 가상계좌 발급 orderNo={}, status={}", orderNo, payment.status());
        return new IssuedVirtualAccount(issuedBank, payment.virtualAccount().accountNumber());
    }
}
