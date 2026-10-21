package com.pocket.market.service;

import com.pocket.market.config.AppProperties;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.LockTimeout;
import com.pocket.market.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentWebhookService {

    private final OrderRepository orderRepository;
    private final AppProperties appProperties;
    private final LockTimeout lockTimeout;

    /**
     * 가상계좌 입금 통보 처리.
     * - 인증: 공유 시크릿을 상수 시간 비교로 검증
     * - 멱등성: 주문 행 비관적 락 + 동일 transactionId 로 이미 PAID 이면 ALREADY_PROCESSED 응답
     *          (pgTransactionId unique 제약으로 DB 레벨에서도 이중 반영 차단)
     * - 금액 검증: 주문 시점 금액 스냅샷과 입금액이 다르면 거부(롤백)
     */
    @Transactional
    public WebhookResponse handleVirtualAccountDeposit(String secret, VirtualAccountDepositWebhookRequest request) {
        verifySecret(secret);

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
        if (order.getStatus() == OrderStatus.PAID) {
            log.error("[Webhook] 다른 거래로 이미 결제된 주문 orderNo={}, txId={} - 환불 확인 필요",
                    order.getOrderNo(), request.transactionId());
            throw new BusinessException(ErrorCode.DUPLICATE_TRANSACTION);
        }
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            log.error("[Webhook] 결제 불가 상태 orderNo={}, status={} - 환불 확인 필요",
                    order.getOrderNo(), order.getStatus());
            throw new BusinessException(ErrorCode.INVALID_ORDER_STATE);
        }

        LocalDateTime paidAt = request.depositedAt() != null ? request.depositedAt() : LocalDateTime.now();
        order.completePayment(request.amount(), request.transactionId(), paidAt);

        log.info("[Webhook] 결제 완료 orderNo={}, amount={}", order.getOrderNo(), request.amount());
        return WebhookResponse.of(Result.PROCESSED, order.getOrderNo());
    }

    private void verifySecret(String secret) {
        byte[] expected = appProperties.getWebhookSecret().getBytes(StandardCharsets.UTF_8);
        byte[] actual = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }
    }
}
