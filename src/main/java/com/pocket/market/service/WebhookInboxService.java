package com.pocket.market.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.WebhookInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 웹훅 inbox 기록. 수신 기록(receive)과 거부 기록(reject)은 주문 처리 트랜잭션 밖에서 호출되어 각자 커밋된다.
 * 성공 결과(complete)는 주문 처리 트랜잭션에 합류해 주문 상태와 함께 커밋/롤백된다.
 */
@Service
@RequiredArgsConstructor
public class WebhookInboxService {

    private final WebhookInboxRepository webhookInboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Long receive(VirtualAccountDepositWebhookRequest request) {
        WebhookInbox inbox = WebhookInbox.receive(
                request.transactionId(),
                request.orderNo(),
                request.status() == null ? null : request.status().name(),
                request.amount(),
                toJson(request),
                LocalDateTime.now());
        return webhookInboxRepository.save(inbox).getId();
    }

    @Transactional
    public void complete(Long inboxId, WebhookInboxResult result) {
        findById(inboxId).complete(result, LocalDateTime.now());
    }

    @Transactional
    public void reject(Long inboxId, ErrorCode errorCode, String errorMessage) {
        findById(inboxId).reject(errorCode, errorMessage, LocalDateTime.now());
    }

    private WebhookInbox findById(Long inboxId) {
        return webhookInboxRepository.findById(inboxId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERNAL_ERROR, "웹훅 수신 기록이 없습니다. id=" + inboxId));
    }

    private String toJson(VirtualAccountDepositWebhookRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException e) {
            return String.valueOf(request);
        }
    }
}
