package com.pocket.market.controller;

import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.service.PaymentWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Webhook", description = "PG 사 웹훅 수신")
@RestController
@RequestMapping("/api/webhooks/payments")
@RequiredArgsConstructor
public class WebhookController {

    private final PaymentWebhookService paymentWebhookService;

    @Operation(summary = "가상계좌 입금 통보",
            description = "금액 검증 후 주문을 PAID, 매물을 SOLD 로 전이한다. 동일 transactionId 재수신 시 ALREADY_PROCESSED(200). "
                    + "만료·취소·다른 거래로 결제된 주문에 입금되면 환불 대상으로 기록하고 REFUND_REQUIRED(200). 모든 수신은 webhook_inbox 에 남는다.")
    @PostMapping("/virtual-account")
    public WebhookResponse handleVirtualAccountDeposit(
            @Parameter(description = "PG 웹훅 공유 시크릿", example = "local-webhook-secret")
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
            @Valid @RequestBody VirtualAccountDepositWebhookRequest request) {
        return paymentWebhookService.handleVirtualAccountDeposit(secret, request);
    }
}
