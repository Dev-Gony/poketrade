package com.pocket.market.service.payment;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.concurrent.ThreadLocalRandom;

/**
 * 로컬/테스트용 가상계좌 발급기. PG 호출 없이 요청한 은행으로 12~14자리 임의 계좌번호를 생성한다.
 * app.payment.provider 를 지정하지 않거나 fake 로 두면 사용된다 (기본값, 키 불필요).
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "fake", matchIfMissing = true)
public class FakeVirtualAccountIssuer implements VirtualAccountIssuer {

    private static final int MIN_DIGITS = 12;
    private static final int MAX_DIGITS = 14;

    @Override
    public IssuedVirtualAccount issue(String orderNo, long amount, String depositorName, VirtualAccountBank bank) {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        int length = random.nextInt(MIN_DIGITS, MAX_DIGITS + 1);
        StringBuilder digits = new StringBuilder(length).append(random.nextInt(1, 10));
        while (digits.length() < length) {
            digits.append(random.nextInt(10));
        }
        return new IssuedVirtualAccount(bank, digits.toString());
    }
}
