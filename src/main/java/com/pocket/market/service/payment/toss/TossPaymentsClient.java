package com.pocket.market.service.payment.toss;

import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 토스페이먼츠 코어 API 클라이언트 (테스트 모드 전용).
 * - 인증: 시크릿 키 뒤에 ':' 를 붙여 Base64 인코딩한 Basic 인증 (https://docs.tosspayments.com/reference/using-api/authorization)
 * - test_ 로 시작하지 않는 키(라이브 키 등)는 생성 시점에 거부해 실제 결제가 일어날 수 없게 한다.
 */
@Slf4j
public class TossPaymentsClient {

    static final String TEST_KEY_PREFIX = "test_";

    private final RestClient restClient;

    public TossPaymentsClient(RestClient.Builder builder, String baseUrl, String secretKey) {
        requireTestKey(secretKey);
        String credentials = Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));
        this.restClient = builder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                .defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {
                    // 오류 본문은 {code, message} 형태이며 키 등 비밀 값을 담지 않는다.
                    String body = StreamUtils.copyToString(response.getBody(), StandardCharsets.UTF_8);
                    log.warn("[Toss] API 오류 {} {} → {} {}", request.getMethod(), request.getURI().getPath(),
                            response.getStatusCode().value(), body);
                    throw new BusinessException(ErrorCode.PAYMENT_PROVIDER_ERROR,
                            "토스페이먼츠 API 오류 (HTTP %d)".formatted(response.getStatusCode().value()));
                })
                .build();
    }

    /** 라이브 키·빈 값이면 기동을 막는다. 예외 메시지에 키 값을 넣지 않는다. */
    static void requireTestKey(String secretKey) {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException(
                    "app.payment.provider=toss 에는 TOSS_SECRET_KEY(테스트 시크릿 키, test_ 로 시작)가 필요합니다.");
        }
        if (!secretKey.startsWith(TEST_KEY_PREFIX)) {
            throw new IllegalStateException(
                    "TOSS_SECRET_KEY 는 test_ 로 시작하는 테스트 키만 허용합니다. 이 데모는 라이브 키로 실행하지 않습니다.");
        }
    }

    /** POST /v1/virtual-accounts : 가상계좌 발급 요청 */
    public TossPayment issueVirtualAccount(TossVirtualAccountRequest request) {
        try {
            return restClient.post()
                    .uri("/v1/virtual-accounts")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(TossPayment.class);
        } catch (RestClientException e) {
            throw providerError("가상계좌 발급", e);
        }
    }

    /** GET /v1/payments/orders/{orderId} : 주문번호로 결제 조회 */
    public TossPayment getPaymentByOrderId(String orderId) {
        try {
            return restClient.get()
                    .uri("/v1/payments/orders/{orderId}", orderId)
                    .retrieve()
                    .body(TossPayment.class);
        } catch (RestClientException e) {
            throw providerError("결제 조회", e);
        }
    }

    private BusinessException providerError(String action, RestClientException e) {
        log.warn("[Toss] {} 호출 실패: {}", action, e.getMessage());
        return new BusinessException(ErrorCode.PAYMENT_PROVIDER_ERROR, "토스페이먼츠 %s 호출에 실패했습니다.".formatted(action));
    }
}
