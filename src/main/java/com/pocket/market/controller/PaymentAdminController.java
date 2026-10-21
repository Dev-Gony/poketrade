package com.pocket.market.controller;

import com.pocket.market.domain.payment.RefundStatus;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.dto.admin.RefundRequestResponse;
import com.pocket.market.dto.admin.WebhookInboxResponse;
import com.pocket.market.service.PaymentAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 운영자용 읽기 전용 결제 감사 API.
 * 학습용 데모라 인증이 없다. 실서비스라면 관리자 권한 검사가 반드시 필요하다 (페이로드에 입금자명이 포함된다).
 * 브라우저 CORS 대상(WebConfig)에 넣지 않았으므로 Swagger UI 등 같은 출처에서만 호출한다.
 */
@Tag(name = "Admin · Payment", description = "웹훅 수신 기록·환불 대상 조회 (읽기 전용)")
@RestController
@RequestMapping("/api/admin/payments")
@RequiredArgsConstructor
public class PaymentAdminController {

    private final PaymentAuditService paymentAuditService;

    @Operation(summary = "웹훅 수신 기록 조회",
            description = "중복·금액 불일치·인증 실패를 포함해 수신한 모든 입금 웹훅. 최신순.")
    @GetMapping("/webhook-inbox")
    public Page<WebhookInboxResponse> webhookInbox(
            @Parameter(description = "주문번호로 필터") @RequestParam(required = false) String orderNo,
            @Parameter(description = "처리 결과로 필터") @RequestParam(required = false) WebhookInboxResult result,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return paymentAuditService.findWebhookInbox(orderNo, result, pageable);
    }

    @Operation(summary = "환불 대상 조회",
            description = "만료·취소·이미 결제된 주문에 들어온 입금. 실제 환불 호출은 하지 않는다(모의 PG).")
    @GetMapping("/refunds")
    public Page<RefundRequestResponse> refunds(
            @RequestParam(defaultValue = "REFUND_REQUIRED") RefundStatus status,
            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        return paymentAuditService.findRefunds(status, pageable);
    }
}
