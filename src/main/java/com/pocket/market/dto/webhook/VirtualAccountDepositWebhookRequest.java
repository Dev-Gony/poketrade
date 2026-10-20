package com.pocket.market.dto.webhook;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;

/**
 * PG 사 가상계좌 입금 통보 페이로드.
 */
public record VirtualAccountDepositWebhookRequest(
        @Schema(description = "PG 거래 고유 ID (멱등 키)", example = "pg_tx_20261020_0001")
        @NotBlank String transactionId,

        @Schema(description = "가맹점 주문번호", example = "ORD-0123456789ABCDEFGHIJ")
        @NotBlank String orderNo,

        @Schema(description = "입금 상태. DONE 만 결제 완료로 처리", example = "DONE")
        @NotNull DepositStatus status,

        @Schema(description = "입금 금액(원)", example = "15000")
        @NotNull @PositiveOrZero Long amount,

        @Schema(description = "입금자명", example = "홍길동")
        String depositorName,

        @Schema(description = "입금 일시")
        LocalDateTime depositedAt
) {

    public enum DepositStatus {
        WAITING_FOR_DEPOSIT, DONE, CANCELED
    }
}
