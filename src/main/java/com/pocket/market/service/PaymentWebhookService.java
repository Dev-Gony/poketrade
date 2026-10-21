package com.pocket.market.service;

import com.pocket.market.config.AppProperties;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.payment.RefundReason;
import com.pocket.market.domain.payment.RefundRequest;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.LockTimeout;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.RefundRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWebhookService {

    private final OrderRepository orderRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final WebhookInboxService webhookInboxService;
    private final TransactionTemplate transactionTemplate;
    private final AppProperties appProperties;
    private final LockTimeout lockTimeout;

    /**
     * 가상계좌 입금 통보 처리.
     * - 기록: 처리 전에 inbox 에 수신 사실을 별도 트랜잭션으로 남기고, 결과(성공/거부)를 같은 행에 갱신한다.
     *        이 메서드 자체는 트랜잭션을 열지 않는다. 열면 inbox 기록이 처리와 함께 롤백되고, 스레드당 커넥션을 2개 잡는다.
     * - 인증: 공유 시크릿을 상수 시간 비교로 검증
     * - 멱등성: 주문 행 비관적 락 + 동일 transactionId 로 이미 PAID 이면 ALREADY_PROCESSED 응답
     *          (pgTransactionId unique 제약으로 DB 레벨에서도 이중 반영 차단)
     * - 금액 검증: 주문 시점 금액 스냅샷과 입금액이 다르면 거부(롤백)
     * - 환불 대상: 만료·취소·다른 거래로 결제 완료된 주문에 들어온 입금은 REFUND_REQUIRED 로 기록하고 200 으로 응답한다.
     *             PG 재전송을 멈추게 하되 돈의 행방은 refund_requests 에 남긴다.
     */
    public WebhookResponse handleVirtualAccountDeposit(String secret, VirtualAccountDepositWebhookRequest request) {
        Long inboxId = webhookInboxService.receive(request);
        try {
            verifySecret(secret);
            return processRecorded(inboxId, request);
        } catch (RuntimeException e) {
            // 처리 트랜잭션은 이미 롤백됐다. 거부 사유만 별도 트랜잭션으로 남긴다.
            recordRejection(inboxId, e);
            throw e;
        }
    }

    /**
     * 인증을 마친 입금 통보를 주문에 반영한다. 공유 시크릿 웹훅과 토스페이먼츠 입금 콜백
     * (TossDepositCallbackService 가 결제 조회로 검증·매핑) 이 같은 inbox 기록·멱등 경로를 쓴다.
     * handleVirtualAccountDeposit 과 같은 이유로 트랜잭션을 열지 않는다.
     */
    public WebhookResponse applyVerifiedDeposit(VirtualAccountDepositWebhookRequest request) {
        Long inboxId = webhookInboxService.receive(request);
        try {
            return processRecorded(inboxId, request);
        } catch (RuntimeException e) {
            recordRejection(inboxId, e);
            throw e;
        }
    }

    private WebhookResponse processRecorded(Long inboxId, VirtualAccountDepositWebhookRequest request) {
        return transactionTemplate.execute(tx -> {
            WebhookResponse response = process(request);
            // 처리 결과는 주문 상태와 같은 트랜잭션에서 커밋된다.
            webhookInboxService.complete(inboxId, WebhookInboxResult.valueOf(response.result().name()));
            return response;
        });
    }

    private WebhookResponse process(VirtualAccountDepositWebhookRequest request) {
        if (request.status() != DepositStatus.DONE) {
            log.info("[Webhook] 처리 대상 아님 orderNo={}, status={}", request.orderNo(), request.status());
            return WebhookResponse.of(Result.IGNORED, request.orderNo());
        }

        lockTimeout.apply();
        Order order = orderRepository.findByOrderNoForUpdate(request.orderNo())
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.isPaidWith(request.transactionId())) {
            log.info("[Webhook] 중복 수신 무시 orderNo={}, txId={}", order.getOrderNo(), request.transactionId());
            return WebhookResponse.of(Result.ALREADY_PROCESSED, order.getOrderNo());
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return requireRefund(order, request);
        }

        LocalDateTime paidAt = request.depositedAt() != null ? request.depositedAt() : LocalDateTime.now();
        order.completePayment(request.amount(), request.transactionId(), paidAt);

        log.info("[Webhook] 결제 완료 orderNo={}, amount={}", order.getOrderNo(), request.amount());
        return WebhookResponse.of(Result.PROCESSED, order.getOrderNo());
    }

    /**
     * 결제할 수 없는 주문에 들어온 입금을 환불 대상으로 남긴다.
     * 주문 행 락 안에서 실행되므로 같은 거래의 재전송이 동시에 와도 환불 건은 1건만 생긴다.
     */
    private WebhookResponse requireRefund(Order order, VirtualAccountDepositWebhookRequest request) {
        if (refundRequestRepository.existsByPgTransactionId(request.transactionId())) {
            log.info("[Webhook] 환불 대상 중복 수신 orderNo={}, txId={}", order.getOrderNo(), request.transactionId());
        } else {
            RefundReason reason = switch (order.getStatus()) {
                case PAID -> RefundReason.ALREADY_PAID;
                case EXPIRED -> RefundReason.ORDER_EXPIRED;
                case CANCELLED -> RefundReason.ORDER_CANCELLED;
                case PENDING_PAYMENT -> throw new IllegalStateException("결제 대기 주문은 환불 대상이 아니다.");
            };
            refundRequestRepository.save(RefundRequest.create(order, request.transactionId(), request.amount(), reason));
            log.warn("[Webhook] 환불 필요 orderNo={}, status={}, txId={}, amount={}",
                    order.getOrderNo(), order.getStatus(), request.transactionId(), request.amount());
        }
        return WebhookResponse.of(Result.REFUND_REQUIRED, order.getOrderNo());
    }

    private void recordRejection(Long inboxId, RuntimeException e) {
        ErrorCode code;
        if (e instanceof BusinessException be) {
            code = be.getErrorCode();
        } else if (e instanceof PessimisticLockingFailureException || e instanceof ObjectOptimisticLockingFailureException) {
            code = ErrorCode.LOCK_ACQUISITION_FAILED;
        } else if (e instanceof DataIntegrityViolationException) {
            code = ErrorCode.DATA_CONFLICT;
        } else {
            code = ErrorCode.INTERNAL_ERROR;
        }
        try {
            webhookInboxService.reject(inboxId, code, e.getMessage());
        } catch (RuntimeException recordFailure) {
            log.error("[Webhook] 거부 기록 실패 inboxId={}", inboxId, recordFailure);
        }
    }

    private void verifySecret(String secret) {
        byte[] expected = appProperties.getWebhookSecret().getBytes(StandardCharsets.UTF_8);
        byte[] actual = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }
    }
}
