package com.pocket.market.dto.order;

import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.service.payment.VirtualAccountBank;

import java.time.LocalDateTime;

public record OrderResponse(
        Long orderId,
        String orderNo,
        Long buyerId,
        Long listingId,
        Long amount,
        OrderStatus status,
        VirtualAccount virtualAccount,
        LocalDateTime paymentDueAt,
        LocalDateTime paidAt,
        String pgTransactionId,
        LocalDateTime createdAt
) {

    /** bankCode 는 enum 이름(KB, SHINHAN ...), bankName 은 한국어 표시명 */
    public record VirtualAccount(String bankCode, String bankName, String accountNumber, String depositorName) {
    }

    public static OrderResponse from(Order order) {
        VirtualAccountBank bank = order.getVirtualAccountBank();
        return new OrderResponse(
                order.getId(),
                order.getOrderNo(),
                order.getBuyer().getId(),
                order.getListing().getId(),
                order.getAmount(),
                order.getStatus(),
                new VirtualAccount(
                        bank == null ? null : bank.name(),
                        bank == null ? null : bank.getDisplayName(),
                        order.getVirtualAccountNumber(),
                        order.getDepositorName()),
                order.getPaymentDueAt(),
                order.getPaidAt(),
                order.getPgTransactionId(),
                order.getCreatedAt()
        );
    }
}
