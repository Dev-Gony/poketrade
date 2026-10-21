package com.pocket.market.controller;

import com.pocket.market.dto.webhook.TossDepositCallbackRequest;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.service.payment.toss.TossDepositCallbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** app.payment.provider=toss 일 때만 등록된다. 개발자센터 웹훅에 DEPOSIT_CALLBACK 이벤트로 이 URL 을 등록한다. */
@Tag(name = "Webhook", description = "PG 사 웹훅 수신")
@RestController
@RequestMapping("/api/webhooks/payments/toss")
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "toss")
@RequiredArgsConstructor
public class TossWebhookController {

    private final TossDepositCallbackService tossDepositCallbackService;

    @Operation(summary = "토스페이먼츠 가상계좌 입금 콜백 (테스트 모드)",
            description = "결제 조회로 secret·상태·금액을 확인한 뒤 공통 입금 처리 경로로 반영한다. 같은 transactionKey 재수신 시 ALREADY_PROCESSED(200).")
    @PostMapping("/deposit-callback")
    public WebhookResponse handleDepositCallback(@Valid @RequestBody TossDepositCallbackRequest request) {
        return tossDepositCallbackService.handle(request);
    }
}
