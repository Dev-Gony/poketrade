package com.pocket.market.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C001", "잘못된 입력값입니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C999", "서버 내부 오류가 발생했습니다."),
    LOCK_ACQUISITION_FAILED(HttpStatus.CONFLICT, "C002", "요청이 몰려 처리하지 못했습니다. 잠시 후 다시 시도해주세요."),
    DATA_CONFLICT(HttpStatus.CONFLICT, "C003", "데이터 충돌이 발생했습니다."),

    // User / Card
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "사용자를 찾을 수 없습니다."),
    CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "CD001", "카드를 찾을 수 없습니다."),

    // Listing
    LISTING_NOT_FOUND(HttpStatus.NOT_FOUND, "L001", "매물을 찾을 수 없습니다."),
    LISTING_NOT_AVAILABLE(HttpStatus.CONFLICT, "L002", "이미 판매되었거나 거래 진행 중인 매물입니다."),
    INVALID_LISTING_STATE(HttpStatus.CONFLICT, "L003", "매물 상태가 올바르지 않습니다."),
    SELF_PURCHASE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "L004", "본인이 등록한 매물은 구매할 수 없습니다."),

    // Order
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "O001", "주문을 찾을 수 없습니다."),
    INVALID_ORDER_STATE(HttpStatus.CONFLICT, "O002", "주문 상태가 올바르지 않습니다."),
    ORDER_ACCESS_DENIED(HttpStatus.FORBIDDEN, "O003", "본인 주문만 취소할 수 있습니다."),

    // Payment
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.BAD_REQUEST, "P001", "결제 금액이 주문 금액과 일치하지 않습니다."),
    INVALID_WEBHOOK_SIGNATURE(HttpStatus.UNAUTHORIZED, "P003", "웹훅 인증에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
