package com.pocket.market.domain.payment;

import com.pocket.market.domain.common.BaseTimeEntity;
import com.pocket.market.domain.order.Order;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 결제할 수 없는 주문에 들어온 입금. 돈은 이미 가상계좌에 들어왔으므로 거부(로그)만 하면 갈 곳 없는 돈이 생긴다.
 * PG 거래 ID 당 1건만 존재하도록 unique 제약을 둬 웹훅 재전송에도 환불 건이 중복 생성되지 않는다.
 */
@Getter
@Entity
@Table(name = "refund_requests", indexes = @Index(name = "idx_refund_requests_status", columnList = "status"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefundRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, unique = true, length = 100)
    private String pgTransactionId;

    /** 실제 입금된 금액 (주문 금액과 다를 수 있다) */
    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundReason reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RefundStatus status;

    private RefundRequest(Order order, String pgTransactionId, Long amount, RefundReason reason) {
        this.order = order;
        this.pgTransactionId = pgTransactionId;
        this.amount = amount;
        this.reason = reason;
        this.status = RefundStatus.REFUND_REQUIRED;
    }

    public static RefundRequest create(Order order, String pgTransactionId, Long amount, RefundReason reason) {
        return new RefundRequest(order, pgTransactionId, amount, reason);
    }
}
