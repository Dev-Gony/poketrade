package com.pocket.market.domain.payment;

import com.pocket.market.exception.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 수신한 입금 웹훅 원장(inbox). 중복·금액 불일치·인증 실패까지 포함해 모든 호출을 1건씩 남긴다.
 * 주문 처리와 별도 트랜잭션으로 먼저 저장되므로, 처리가 롤백돼도 수신 사실은 사라지지 않는다.
 * 존재하지 않는 주문번호로 온 호출도 기록해야 하므로 주문과 FK 로 묶지 않는다.
 */
@Getter
@Entity
@Table(name = "webhook_inbox", indexes = {
        @Index(name = "idx_webhook_inbox_order_no", columnList = "order_no"),
        @Index(name = "idx_webhook_inbox_tx_id", columnList = "transaction_id"),
        @Index(name = "idx_webhook_inbox_result", columnList = "result")
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WebhookInbox {

    private static final int PAYLOAD_MAX_LENGTH = 4000;
    private static final int ERROR_MESSAGE_MAX_LENGTH = 500;

    /**
     * 같은 웹훅이 동시에 여러 건 들어오면 이 테이블에 INSERT 가 동시에 몰린다.
     * IDENTITY 대신 pooled 시퀀스로 Hibernate 가 메모리에서 id 를 나눠 주어 DB 측 id 생성 경합을 없앤다
     * (H2 테스트 DB 에서 동시 IDENTITY INSERT 가 드물게 같은 키를 내는 현상도 함께 피한다).
     */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "webhook_inbox_seq")
    @SequenceGenerator(name = "webhook_inbox_seq", sequenceName = "webhook_inbox_seq", allocationSize = 50)
    private Long id;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @Column(name = "order_no", length = 64)
    private String orderNo;

    /** PG 가 보낸 입금 상태 (DONE, CANCELED ...) */
    @Column(length = 30)
    private String depositStatus;

    private Long amount;

    /** 수신 페이로드(JSON) */
    @Column(nullable = false, length = PAYLOAD_MAX_LENGTH)
    private String payload;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WebhookInboxResult result;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private ErrorCode errorCode;

    @Column(length = ERROR_MESSAGE_MAX_LENGTH)
    private String errorMessage;

    private LocalDateTime processedAt;

    private WebhookInbox(String transactionId, String orderNo, String depositStatus, Long amount,
                         String payload, LocalDateTime receivedAt) {
        this.transactionId = transactionId;
        this.orderNo = orderNo;
        this.depositStatus = depositStatus;
        this.amount = amount;
        this.payload = truncate(payload, PAYLOAD_MAX_LENGTH);
        this.receivedAt = receivedAt;
        this.result = WebhookInboxResult.RECEIVED;
    }

    public static WebhookInbox receive(String transactionId, String orderNo, String depositStatus, Long amount,
                                       String payload, LocalDateTime receivedAt) {
        return new WebhookInbox(transactionId, orderNo, depositStatus, amount, payload, receivedAt);
    }

    public void complete(WebhookInboxResult result, LocalDateTime processedAt) {
        this.result = result;
        this.processedAt = processedAt;
    }

    public void reject(ErrorCode errorCode, String errorMessage, LocalDateTime processedAt) {
        this.result = WebhookInboxResult.REJECTED;
        this.errorCode = errorCode;
        this.errorMessage = truncate(errorMessage, ERROR_MESSAGE_MAX_LENGTH);
        this.processedAt = processedAt;
    }

    private static String truncate(String value, int maxLength) {
        return value == null || value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
