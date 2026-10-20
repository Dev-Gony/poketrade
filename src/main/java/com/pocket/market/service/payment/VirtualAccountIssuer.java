package com.pocket.market.service.payment;

/**
 * PG 사 가상계좌 발급 연동 추상화. 실제 PG 연동 시 이 인터페이스의 구현체를 교체한다.
 */
public interface VirtualAccountIssuer {

    IssuedVirtualAccount issue(String orderNo, long amount, String depositorName, VirtualAccountBank bank);

    record IssuedVirtualAccount(VirtualAccountBank bank, String accountNumber) {
    }
}
