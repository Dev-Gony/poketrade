package com.pocket.market.domain.order;

import com.pocket.market.domain.common.BaseTimeEntity;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.user.User;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.service.payment.VirtualAccountBank;
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

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Entity
@Table(name = "orders", indexes = @Index(name = "idx_orders_status_due", columnList = "status, payment_due_at"))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** PG 사에 전달되는 가맹점 주문번호 */
    @Column(nullable = false, unique = true, length = 64)
    private String orderNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "listing_id", nullable = false)
    private Listing listing;

    /** 주문 시점 금액 스냅샷. 입금 금액 검증은 이 값을 기준으로 한다. */
    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private VirtualAccountBank virtualAccountBank;

    @Column(length = 50)
    private String virtualAccountNumber;

    @Column(length = 20)
    private String depositorName;

    @Column(name = "payment_due_at", nullable = false)
    private LocalDateTime paymentDueAt;

    /** PG 거래 고유 ID. unique 제약으로 동일 입금 건의 중복 반영을 DB 레벨에서도 차단한다. */
    @Column(unique = true, length = 100)
    private String pgTransactionId;

    private LocalDateTime paidAt;

    private Order(User buyer, Listing listing, LocalDateTime paymentDueAt) {
        this.orderNo = generateOrderNo();
        this.buyer = buyer;
        this.listing = listing;
        this.amount = listing.getPrice();
        this.status = OrderStatus.PENDING_PAYMENT;
        this.paymentDueAt = paymentDueAt;
    }

    public static Order create(User buyer, Listing listing, LocalDateTime paymentDueAt) {
        return new Order(buyer, listing, paymentDueAt);
    }

    private static String generateOrderNo() {
        return "ORD-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();
    }

    public void assignVirtualAccount(VirtualAccountBank bank, String accountNumber, String depositorName) {
        this.virtualAccountBank = bank;
        this.virtualAccountNumber = accountNumber;
        this.depositorName = depositorName;
    }

    public boolean isPaidWith(String transactionId) {
        return status == OrderStatus.PAID && transactionId.equals(pgTransactionId);
    }

    public void completePayment(long paidAmount, String transactionId, LocalDateTime paidAt) {
        if (status != OrderStatus.PENDING_PAYMENT) {
            throw new BusinessException(ErrorCode.INVALID_ORDER_STATE);
        }
        if (this.amount != paidAmount) {
            throw new BusinessException(ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "주문 금액(%d)과 입금 금액(%d)이 일치하지 않습니다.".formatted(this.amount, paidAmount));
        }
        this.status = OrderStatus.PAID;
        this.pgTransactionId = transactionId;
        this.paidAt = paidAt;
        this.listing.markSold();
    }

    public void expire() {
        if (status != OrderStatus.PENDING_PAYMENT) {
            throw new BusinessException(ErrorCode.INVALID_ORDER_STATE);
        }
        this.status = OrderStatus.EXPIRED;
        this.listing.release();
    }
}
