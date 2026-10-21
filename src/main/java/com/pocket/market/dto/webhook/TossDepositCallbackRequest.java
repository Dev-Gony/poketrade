package com.pocket.market.dto.webhook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * 토스페이먼츠 DEPOSIT_CALLBACK (가상계좌 입금·입금 취소) 웹훅 본문.
 * 금액이 없으므로 금액·상태는 결제 조회 API 로 다시 확인한다.
 * https://docs.tosspayments.com/reference/using-api/webhook-events
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TossDepositCallbackRequest(
        @Schema(description = "웹훅 생성 시각 (yyyy-MM-dd'T'HH:mm:ss.SSSSSS)", example = "2026-10-21T14:05:12.000000")
        String createdAt,

        @Schema(description = "결제 응답의 secret 과 같아야 정상 요청")
        @NotBlank String secret,

        @Schema(description = "변경된 결제 상태", example = "DONE")
        @NotBlank String status,

        @Schema(description = "가상계좌 거래 키 (멱등 키로 사용)", example = "9FF15E1A29D0E77C218F57262BFA4986")
        @NotBlank String transactionKey,

        @Schema(description = "가맹점 주문번호", example = "ORD-0123456789ABCDEFGHIJ")
        @NotBlank String orderId
) {

    @Override
    public String toString() {
        return "TossDepositCallbackRequest[orderId=%s, status=%s, transactionKey=%s]"
                .formatted(orderId, status, transactionKey);
    }
}
