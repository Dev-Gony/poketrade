package com.pocket.market.service.payment;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 가상계좌 발급 은행. 프론트엔드는 enum 이름(KB, SHINHAN ...)을 코드로 주고받고, 화면 표시는 언어별로 번역한다.
 */
@Getter
@RequiredArgsConstructor
public enum VirtualAccountBank {
    KB("KB국민은행"),
    SHINHAN("신한은행"),
    TOSS("토스뱅크"),
    WOORI("우리은행"),
    HANA("하나은행");

    private final String displayName;
}
