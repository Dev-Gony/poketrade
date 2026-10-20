package com.pocket.market.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Component
public class AppProperties {

    @Value("${app.order.payment-due-hours:24}")
    private long paymentDueHours;

    @Value("${app.payment.webhook-secret}")
    private String webhookSecret;

    /** 브라우저에서 API 를 직접 호출할 수 있는 출처 패턴 (CORS) */
    @Value("${app.cors.allowed-origin-patterns:http://localhost:[*],http://127.0.0.1:[*]}")
    private List<String> corsAllowedOriginPatterns;
}
