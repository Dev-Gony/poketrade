package com.pocket.market.service.payment.toss;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.UserRepository;
import com.pocket.market.service.OrderService;
import com.pocket.market.service.payment.VirtualAccountBank;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * provider=toss 배선 전체(발급기 선택 → 주문 → 입금 콜백 엔드포인트 → 공통 멱등 경로)를 검증한다.
 * TossPaymentsClient 만 샘플 응답을 돌려주는 목으로 바꿔 실제 토스 API 는 호출하지 않는다.
 */
@SpringBootTest(properties = {
        "app.payment.provider=toss",
        "app.payment.toss.secret-key=test_sk_integration_test_dummy",
        "spring.datasource.url=jdbc:h2:mem:pocket-toss-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000"
})
@AutoConfigureMockMvc
class TossProviderIntegrationTest {

    private static final long PRICE = 15_000L;
    private static final String CALLBACK_URL = "/api/webhooks/payments/toss/deposit-callback";

    @MockBean
    private TossPaymentsClient tossPaymentsClient;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private OrderService orderService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CardRepository cardRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private OrderRepository orderRepository;

    private Listing listing;
    private OrderResponse order;

    @BeforeEach
    void setUp() {
        User seller = userRepository.save(User.create("seller@test.com", "seller"));
        User buyer = userRepository.save(User.create("buyer@test.com", "buyer"));
        Card card = cardRepository.save(Card.create("피카츄 ex", "스칼렛&바이올렛", "SV1-063", CardRarity.RR, null));
        listing = listingRepository.save(Listing.create(seller, card, PRICE, CardCondition.MINT, "test"));

        when(tossPaymentsClient.issueVirtualAccount(any())).thenAnswer(invocation -> {
            TossVirtualAccountRequest request = invocation.getArgument(0);
            return TossSamples.read("virtual-account-issued.json", request.orderId(), TossPayment.class);
        });
        order = orderService.placeOrder(buyer.getId(), listing.getId(), VirtualAccountBank.SHINHAN, "buyer");
    }

    @AfterEach
    void tearDown() {
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    private void stubPaymentLookup(String file) {
        when(tossPaymentsClient.getPaymentByOrderId(order.orderNo()))
                .thenReturn(TossSamples.read(file, order.orderNo(), TossPayment.class));
    }

    @Test
    @DisplayName("주문 시 토스 테스트 가상계좌가 발급되어 주문에 저장된다")
    void issuesTossVirtualAccount() {
        Order saved = orderRepository.findById(order.orderId()).orElseThrow();
        assertThat(saved.getVirtualAccountNumber()).isEqualTo("X6105412345678");
        assertThat(saved.getVirtualAccountBank()).isEqualTo(VirtualAccountBank.SHINHAN);
    }

    @Test
    @DisplayName("입금 완료 콜백은 주문을 PAID 로 만들고, 같은 콜백 재전송은 ALREADY_PROCESSED 로 응답한다")
    void depositCallbackIsIdempotent() throws Exception {
        stubPaymentLookup("payment-done.json");
        String body = TossSamples.json("deposit-callback-done.json", order.orderNo());

        mockMvc.perform(post(CALLBACK_URL).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("PROCESSED"));
        mockMvc.perform(post(CALLBACK_URL).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("ALREADY_PROCESSED"));

        Order paid = orderRepository.findById(order.orderId()).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(paid.getPgTransactionId()).isEqualTo(TossSamples.DONE_TRANSACTION_KEY);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus()).isEqualTo(ListingStatus.SOLD);
    }

    @Test
    @DisplayName("secret 이 다른 위조 콜백은 401 로 거부하고 주문을 바꾸지 않는다")
    void forgedCallbackIsRejected() throws Exception {
        stubPaymentLookup("payment-done.json");
        String body = TossSamples.json("deposit-callback-done.json", order.orderNo())
                .replace(TossSamples.SECRET, "ps_forged_secret");

        mockMvc.perform(post(CALLBACK_URL).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("P003"));

        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("토스 결제 금액이 주문 금액과 다르면 거부한다")
    void amountMismatchIsRejected() throws Exception {
        String mismatched = TossSamples.json("payment-done.json", order.orderNo())
                .replace("\"totalAmount\": 15000", "\"totalAmount\": 14999");
        when(tossPaymentsClient.getPaymentByOrderId(order.orderNo()))
                .thenReturn(TossSamples.MAPPER.readValue(mismatched, TossPayment.class));

        mockMvc.perform(post(CALLBACK_URL).contentType(MediaType.APPLICATION_JSON)
                        .content(TossSamples.json("deposit-callback-done.json", order.orderNo())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("P001"));

        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
    }
}
