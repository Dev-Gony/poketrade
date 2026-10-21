package com.pocket.market.service.payment.toss;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "toss")
public class TossPaymentsConfig {

    @Bean
    public TossPaymentsClient tossPaymentsClient(
            RestClient.Builder builder,
            @Value("${app.payment.toss.base-url:https://api.tosspayments.com}") String baseUrl,
            @Value("${app.payment.toss.secret-key:}") String secretKey) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        // 토스는 웹훅 응답을 10초 안에 기다리므로 결제 조회도 그 안에 끝나야 한다.
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        return new TossPaymentsClient(builder.requestFactory(requestFactory), baseUrl, secretKey);
    }
}
