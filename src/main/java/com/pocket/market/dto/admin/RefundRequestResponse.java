package com.pocket.market.dto.admin;

import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.payment.RefundReason;
import com.pocket.market.domain.payment.RefundRequest;
import com.pocket.market.domain.payment.RefundStatus;

import java.time.LocalDateTime;

public record RefundRequestResponse(
        Long refundId,
        Long orderId,
        String orderNo,
        OrderStatus orderStatus,
        String pgTransactionId,
        Long amount,
        RefundReason reason,
        RefundStatus status,
        LocalDateTime createdAt
) {

    public static RefundRequestResponse from(RefundRequest refund) {
        return new RefundRequestResponse(
                refund.getId(),
                refund.getOrder().getId(),
                refund.getOrder().getOrderNo(),
                refund.getOrder().getStatus(),
                refund.getPgTransactionId(),
                refund.getAmount(),
                refund.getReason(),
                refund.getStatus(),
                refund.getCreatedAt()
        );
    }
}
