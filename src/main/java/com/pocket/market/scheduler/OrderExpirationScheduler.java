package com.pocket.market.scheduler;

import com.pocket.market.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 입금 기한이 지난 주문을 주기적으로 만료 처리해 선점된 재고를 해제한다.
 * 주문 단위로 별도 트랜잭션을 사용해 한 건의 실패가 전체에 영향을 주지 않도록 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true")
public class OrderExpirationScheduler {

    private final OrderService orderService;

    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void expireOverdueOrders() {
        LocalDateTime now = LocalDateTime.now();
        for (Long orderId : orderService.findOverdueOrderIds(now)) {
            try {
                orderService.expireOrder(orderId, now);
            } catch (Exception e) {
                log.warn("[Scheduler] 주문 만료 처리 실패 orderId={}", orderId, e);
            }
        }
    }
}
