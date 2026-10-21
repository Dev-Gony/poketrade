package com.pocket.market.service.payment.toss;

import com.pocket.market.dto.webhook.TossDepositCallbackRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.service.PaymentWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 토스페이먼츠 DEPOSIT_CALLBACK 처리.
 * 1) 콜백 status 가 DONE 이 아니면(입금 취소·오류로 WAITING_FOR_DEPOSIT 복귀 등) 무시
 * 2) 주문번호로 결제를 조회해 콜백 secret 이 결제의 secret 과 같은지 상수 시간 비교 (토스 문서의 검증 방식)
 * 3) 조회한 결제 상태·금액을 기준으로 기존 멱등 경로(PaymentWebhookService.applyVerifiedDeposit)에 넘긴다.
 *    transactionKey 가 pgTransactionId 가 되어 재전송 웹훅은 ALREADY_PROCESSED 로 응답한다.
 * 결제 조회는 주문 행 락을 잡기 전에(트랜잭션 밖에서) 수행해 네트워크 대기 중에 락을 쥐지 않는다.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "toss")
@RequiredArgsConstructor
public class TossDepositCallbackService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final TossPaymentsClient tossPaymentsClient;
    private final PaymentWebhookService paymentWebhookService;

    public WebhookResponse handle(TossDepositCallbackRequest callback) {
        if (!TossPayment.STATUS_DONE.equals(callback.status())) {
            log.info("[Toss] 처리 대상 아님 orderId={}, status={}", callback.orderId(), callback.status());
            return WebhookResponse.of(Result.IGNORED, callback.orderId());
        }

        TossPayment payment = tossPaymentsClient.getPaymentByOrderId(callback.orderId());
        verify(callback, payment);

        if (!TossPayment.STATUS_DONE.equals(payment.status())) {
            // 콜백이 늦게 도착해 그 사이 상태가 바뀐 경우. 결제 조회 결과를 진실로 본다.
            log.info("[Toss] 결제 상태가 DONE 이 아님 orderId={}, status={}", callback.orderId(), payment.status());
            return WebhookResponse.of(Result.IGNORED, callback.orderId());
        }
        return paymentWebhookService.applyVerifiedDeposit(toDepositRequest(callback, payment));
    }

    static void verify(TossDepositCallbackRequest callback, TossPayment payment) {
        if (payment == null || payment.secret() == null || !callback.orderId().equals(payment.orderId())) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }
        byte[] expected = payment.secret().getBytes(StandardCharsets.UTF_8);
        byte[] actual = callback.secret().getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expected, actual)) {
            log.warn("[Toss] 입금 콜백 secret 불일치 orderId={}", callback.orderId());
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        }
    }

    static VirtualAccountDepositWebhookRequest toDepositRequest(TossDepositCallbackRequest callback, TossPayment payment) {
        if (payment.totalAmount() == null) {
            throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_ERROR, "토스페이먼츠 결제 조회에 금액이 없습니다.");
        }
        String depositor = payment.virtualAccount() != null ? payment.virtualAccount().customerName() : null;
        LocalDateTime paidAt = payment.approvedAt() != null
                ? payment.approvedAt().atZoneSameInstant(SEOUL).toLocalDateTime()
                : null;
        return new VirtualAccountDepositWebhookRequest(
                callback.transactionKey(), payment.orderId(), DepositStatus.DONE,
                payment.totalAmount(), depositor, paidAt);
    }
}
