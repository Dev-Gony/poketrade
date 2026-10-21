package com.pocket.market.repository;

import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WebhookInboxRepository extends JpaRepository<WebhookInbox, Long> {

    List<WebhookInbox> findByOrderNoOrderByIdAsc(String orderNo);

    long countByOrderNoAndResult(String orderNo, WebhookInboxResult result);

    Page<WebhookInbox> findByOrderNo(String orderNo, Pageable pageable);

    Page<WebhookInbox> findByResult(WebhookInboxResult result, Pageable pageable);

    Page<WebhookInbox> findByOrderNoAndResult(String orderNo, WebhookInboxResult result, Pageable pageable);
}
