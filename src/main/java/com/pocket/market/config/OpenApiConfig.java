package com.pocket.market.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI pocketMarketOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Pocket Market API")
                .description("카드 거래 마켓 REST API - 매물, 즉시 구매, 가상계좌 입금 웹훅")
                .version("v1"));
    }
}
