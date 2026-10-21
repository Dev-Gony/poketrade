package com.pocket.market.service.payment.toss;

import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** 실제 토스 API 를 부르지 않고 MockRestServiceServer 에 샘플 응답을 물려 요청·응답 매핑을 검증한다. */
class TossPaymentsClientTest {

    private static final String BASE_URL = "https://api.tosspayments.test";
    private static final String KEY = "test_sk_unit_test_dummy_key";
    private static final String ORDER_NO = "ORD-0123456789ABCDEFGHIJ";

    private MockRestServiceServer server;
    private TossPaymentsClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new TossPaymentsClient(builder, BASE_URL, KEY);
    }

    @Test
    @DisplayName("가상계좌 발급은 시크릿 키 Basic 인증과 문서의 요청 필드로 호출하고 Payment 응답을 매핑한다")
    void issueVirtualAccount() {
        String basic = Base64.getEncoder().encodeToString((KEY + ":").getBytes(StandardCharsets.UTF_8));
        server.expect(requestTo(BASE_URL + "/v1/virtual-accounts"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Basic " + basic))
                .andExpect(jsonPath("$.amount").value(15000))
                .andExpect(jsonPath("$.orderId").value(ORDER_NO))
                .andExpect(jsonPath("$.customerName").value("buyer"))
                .andExpect(jsonPath("$.bank").value("88"))
                .andExpect(jsonPath("$.validHours").value(24))
                .andRespond(withSuccess(TossSamples.json("virtual-account-issued.json", ORDER_NO), MediaType.APPLICATION_JSON));

        TossPayment payment = client.issueVirtualAccount(
                new TossVirtualAccountRequest(15000, ORDER_NO, "PokeTrade 데모 주문", "buyer", "88", 24));

        server.verify();
        assertThat(payment.orderId()).isEqualTo(ORDER_NO);
        assertThat(payment.status()).isEqualTo("WAITING_FOR_DEPOSIT");
        assertThat(payment.secret()).isEqualTo(TossSamples.SECRET);
        assertThat(payment.totalAmount()).isEqualTo(15000L);
        assertThat(payment.virtualAccount().accountNumber()).isEqualTo("X6105412345678");
        assertThat(payment.virtualAccount().bankCode()).isEqualTo("88");
        assertThat(payment.toString()).doesNotContain(TossSamples.SECRET);
    }

    @Test
    @DisplayName("주문번호로 결제를 조회해 입금 완료 시각을 매핑한다")
    void getPaymentByOrderId() {
        server.expect(requestTo(BASE_URL + "/v1/payments/orders/" + ORDER_NO))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(TossSamples.json("payment-done.json", ORDER_NO), MediaType.APPLICATION_JSON));

        TossPayment payment = client.getPaymentByOrderId(ORDER_NO);

        assertThat(payment.status()).isEqualTo("DONE");
        assertThat(payment.approvedAt()).isNotNull();
    }

    @Test
    @DisplayName("토스 API 오류 응답은 PAYMENT_PROVIDER_ERROR 로 변환한다")
    void errorResponseIsMapped() {
        server.expect(requestTo(BASE_URL + "/v1/payments/orders/" + ORDER_NO))
                .andRespond(withStatus(HttpStatus.NOT_FOUND).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"code\":\"NOT_FOUND_PAYMENT\",\"message\":\"존재하지 않는 결제 정보 입니다.\"}"));

        assertThatThrownBy(() -> client.getPaymentByOrderId(ORDER_NO))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_PROVIDER_ERROR);
    }

    @Test
    @DisplayName("test_ 로 시작하지 않는 키(라이브 키)나 빈 키는 거부하고 메시지에 키를 노출하지 않는다")
    void rejectsNonTestKeys() {
        String liveKey = "live_sk_should_never_be_used";
        assertThatThrownBy(() -> new TossPaymentsClient(RestClient.builder(), BASE_URL, liveKey))
                .isInstanceOf(IllegalStateException.class)
                .message().doesNotContain(liveKey);
        assertThatThrownBy(() -> new TossPaymentsClient(RestClient.builder(), BASE_URL, ""))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TossPaymentsClient(RestClient.builder(), BASE_URL, null))
                .isInstanceOf(IllegalStateException.class);
    }
}
