package com.pocket.market.service;

import com.pocket.market.domain.payment.RefundStatus;
import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.dto.admin.RefundRequestResponse;
import com.pocket.market.dto.admin.WebhookInboxResponse;
import com.pocket.market.repository.RefundRequestRepository;
import com.pocket.market.repository.WebhookInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 운영자용 결제 감사 조회 (웹훅 수신 기록·환불 대상) */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentAuditService {

    private final WebhookInboxRepository webhookInboxRepository;
    private final RefundRequestRepository refundRequestRepository;

    public Page<WebhookInboxResponse> findWebhookInbox(String orderNo, WebhookInboxResult result, Pageable pageable) {
        boolean byOrder = orderNo != null && !orderNo.isBlank();
        Page<WebhookInbox> page;
        if (byOrder && result != null) {
            page = webhookInboxRepository.findByOrderNoAndResult(orderNo, result, pageable);
        } else if (byOrder) {
            page = webhookInboxRepository.findByOrderNo(orderNo, pageable);
        } else if (result != null) {
            page = webhookInboxRepository.findByResult(result, pageable);
        } else {
            page = webhookInboxRepository.findAll(pageable);
        }
        return page.map(WebhookInboxResponse::from);
    }

    public Page<RefundRequestResponse> findRefunds(RefundStatus status, Pageable pageable) {
        return refundRequestRepository.findByStatus(status, pageable).map(RefundRequestResponse::from);
    }
}
