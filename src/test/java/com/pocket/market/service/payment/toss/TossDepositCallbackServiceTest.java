package com.pocket.market.service.payment.toss;

import com.pocket.market.dto.webhook.TossDepositCallbackRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.service.PaymentWebhookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** 샘플 페이로드로 DEPOSIT_CALLBACK 의 검증·매핑만 단위 테스트한다. */
class TossDepositCallbackServiceTest {

    private static final String ORDER_NO = "ORD-0123456789ABCDEFGHIJ";

    private TossPaymentsClient client;
    private PaymentWebhookService paymentWebhookService;
    private TossDepositCallbackService service;

    @BeforeEach
    void setUp() {
        client = mock(TossPaymentsClient.class);
        paymentWebhookService = mock(PaymentWebhookService.class);
        service = new TossDepositCallbackService(client, paymentWebhookService);
    }

    private TossDepositCallbackRequest callback(String file) {
        return TossSamples.read(file, ORDER_NO, TossDepositCallbackRequest.class);
    }

    private TossPayment payment(String file) {
        return TossSamples.read(file, ORDER_NO, TossPayment.class);
    }

    @Test
    @DisplayName("입금 완료 콜백은 결제 조회 금액·transactionKey 로 공통 입금 요청에 매핑된다")
    void mapsDoneCallback() {
        when(client.getPaymentByOrderId(ORDER_NO)).thenReturn(payment("payment-done.json"));
        when(paymentWebhookService.applyVerifiedDeposit(any()))
                .thenReturn(WebhookResponse.of(Result.PROCESSED, ORDER_NO));

        WebhookResponse response = service.handle(callback("deposit-callback-done.json"));

        ArgumentCaptor<VirtualAccountDepositWebhookRequest> captor =
                ArgumentCaptor.forClass(VirtualAccountDepositWebhookRequest.class);
        verify(paymentWebhookService).applyVerifiedDeposit(captor.capture());
        VirtualAccountDepositWebhookRequest mapped = captor.getValue();
        assertThat(response.result()).isEqualTo(Result.PROCESSED);
        assertThat(mapped.transactionId()).isEqualTo(TossSamples.DONE_TRANSACTION_KEY);
        assertThat(mapped.orderNo()).isEqualTo(ORDER_NO);
        assertThat(mapped.status()).isEqualTo(DepositStatus.DONE);
        assertThat(mapped.amount()).isEqualTo(15000L);
        assertThat(mapped.depositorName()).isEqualTo("buyer");
        assertThat(mapped.depositedAt()).isEqualTo(LocalDateTime.of(2026, 10, 21, 14, 5, 12));
    }

    @Test
    @DisplayName("secret 이 결제 조회 결과와 다르면 INVALID_WEBHOOK_SIGNATURE 로 거부한다")
    void rejectsWrongSecret() {
        when(client.getPaymentByOrderId(ORDER_NO)).thenReturn(payment("payment-done.json"));
        TossDepositCallbackRequest done = callback("deposit-callback-done.json");
        TossDepositCallbackRequest forged = new TossDepositCallbackRequest(
                done.createdAt(), "ps_forged", done.status(), done.transactionKey(), done.orderId());

        assertThatThrownBy(() -> service.handle(forged))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        verify(paymentWebhookService, never()).applyVerifiedDeposit(any());
    }

    @Test
    @DisplayName("DONE 이 아닌 콜백(입금 오류로 대기 복귀 등)은 결제 조회 없이 무시한다")
    void ignoresNonDoneCallback() {
        WebhookResponse response = service.handle(callback("deposit-callback-waiting.json"));

        assertThat(response.result()).isEqualTo(Result.IGNORED);
        verifyNoInteractions(client, paymentWebhookService);
    }

    @Test
    @DisplayName("콜백은 DONE 이지만 결제 조회 상태가 DONE 이 아니면 무시한다")
    void ignoresWhenPaymentNotDone() {
        when(client.getPaymentByOrderId(ORDER_NO)).thenReturn(payment("virtual-account-issued.json"));

        WebhookResponse response = service.handle(callback("deposit-callback-done.json"));

        assertThat(response.result()).isEqualTo(Result.IGNORED);
        verify(paymentWebhookService, never()).applyVerifiedDeposit(any());
    }
}
