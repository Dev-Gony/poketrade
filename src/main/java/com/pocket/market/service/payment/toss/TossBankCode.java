package com.pocket.market.service.payment.toss;

import com.pocket.market.service.payment.VirtualAccountBank;

import java.util.Arrays;
import java.util.Optional;

/**
 * VirtualAccountBank ↔ 토스페이먼츠 두 자리 은행 코드.
 * https://docs.tosspayments.com/codes/org-codes#은행-코드
 */
public enum TossBankCode {
    KB(VirtualAccountBank.KB, "06"),
    SHINHAN(VirtualAccountBank.SHINHAN, "88"),
    TOSS(VirtualAccountBank.TOSS, "92"),
    WOORI(VirtualAccountBank.WOORI, "20"),
    HANA(VirtualAccountBank.HANA, "81");

    private final VirtualAccountBank bank;
    private final String code;

    TossBankCode(VirtualAccountBank bank, String code) {
        this.bank = bank;
        this.code = code;
    }

    public static String codeOf(VirtualAccountBank bank) {
        return Arrays.stream(values())
                .filter(c -> c.bank == bank)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("토스 은행 코드가 없는 은행: " + bank))
                .code;
    }

    public static Optional<VirtualAccountBank> bankOf(String code) {
        return Arrays.stream(values())
                .filter(c -> c.code.equals(code))
                .findFirst()
                .map(c -> c.bank);
    }
}
