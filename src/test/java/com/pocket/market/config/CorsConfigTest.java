package com.pocket.market.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CorsConfigTest {

    private static final String FRONTEND_ORIGIN = "http://localhost:3000";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("프론트엔드 출처의 주문 생성 preflight 는 X-User-Id 헤더와 함께 허용된다")
    void orderPreflightIsAllowed() throws Exception {
        mockMvc.perform(options("/api/orders")
                        .header("Origin", FRONTEND_ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,x-user-id"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")));
    }

    @Test
    @DisplayName("매물 목록 조회 응답에 CORS 허용 헤더가 포함된다")
    void listingsResponseHasCorsHeader() throws Exception {
        mockMvc.perform(get("/api/listings").header("Origin", FRONTEND_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", FRONTEND_ORIGIN));
    }

    @Test
    @DisplayName("PG 웹훅은 서버 간 호출이므로 브라우저 출처의 preflight 를 거부한다")
    void webhookIsNotCorsEnabled() throws Exception {
        mockMvc.perform(options("/api/webhooks/payments/virtual-account")
                        .header("Origin", FRONTEND_ORIGIN)
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("허용되지 않은 외부 출처는 거부된다")
    void unknownOriginIsRejected() throws Exception {
        mockMvc.perform(options("/api/orders")
                        .header("Origin", "https://evil.example.com")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }
}
