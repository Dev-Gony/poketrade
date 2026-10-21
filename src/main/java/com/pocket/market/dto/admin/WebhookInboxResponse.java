package com.pocket.market.dto.admin;

import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;

import java.time.LocalDateTime;

public record WebhookInboxResponse(
        Long id,
        String transactionId,
        String orderNo,
        String depositStatus,
        Long amount,
        WebhookInboxResult result,
        /** ErrorCode 이름 (REJECTED 일 때만) */
        String errorCode,
        String errorMessage,
        String payload,
        LocalDateTime receivedAt,
        LocalDateTime processedAt
) {

    public static WebhookInboxResponse from(WebhookInbox inbox) {
        return new WebhookInboxResponse(
                inbox.getId(),
                inbox.getTransactionId(),
                inbox.getOrderNo(),
                inbox.getDepositStatus(),
                inbox.getAmount(),
                inbox.getResult(),
                inbox.getErrorCode() == null ? null : inbox.getErrorCode().name(),
                inbox.getErrorMessage(),
                inbox.getPayload(),
                inbox.getReceivedAt(),
                inbox.getProcessedAt()
        );
    }
}
