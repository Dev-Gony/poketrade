package com.pocket.market.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.http.HttpHeaders;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import static org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO;

/**
 * - Page 응답을 안정적인 JSON 구조(PagedModel)로 직렬화한다.
 * - 프론트엔드(Next.js, 브라우저)가 매물·주문 API 를 직접 호출할 수 있도록 CORS 를 연다.
 *   PG 웹훅(/api/webhooks/**)은 서버 간 호출이므로 CORS 대상에서 제외한다.
 */
@Configuration
@RequiredArgsConstructor
@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)
public class WebConfig implements WebMvcConfigurer {

    private static final String[] BROWSER_API_PATHS = {"/api/listings/**", "/api/orders/**"};

    private final AppProperties appProperties;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] originPatterns = appProperties.getCorsAllowedOriginPatterns().toArray(String[]::new);
        for (String path : BROWSER_API_PATHS) {
            registry.addMapping(path)
                    .allowedOriginPatterns(originPatterns)
                    .allowedMethods("GET", "POST", "OPTIONS")
                    // X-User-Id: 인증 연동 전 임시 사용자 식별 헤더
                    .allowedHeaders(HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT, "X-User-Id")
                    .maxAge(3600);
        }
    }
}
