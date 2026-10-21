package com.pocket.market.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.order.CreateOrderRequest;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.UserRepository;
import com.pocket.market.support.PostgresContainers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.context.ImportTestcontainers;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PostgreSQL 에서 잠금 대기가 lock_timeout(3초)으로 끊기고 409 C002 로 응답되는지 검증한다.
 * <p>
 * 별도 트랜잭션이 행을 FOR UPDATE 로 쥔 채 놓지 않는 상황(느린 트랜잭션·장애)을 만들고 API 를 호출한다.
 * lock_timeout 이 없으면 요청은 잠금이 풀릴 때까지 끝없이 대기한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@ImportTestcontainers(PostgresContainers.class)
class LockTimeoutPostgresTest {

    private static final String SECRET = "test-webhook-secret";
    private static final long PRICE = 15_000L;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private TransactionTemplate transactionTemplate;
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

    private User buyer;
    private Listing listing;
    private final ExecutorService holder = Executors.newSingleThreadExecutor();

    @BeforeEach
    void setUp() {
        User seller = userRepository.save(User.create("seller@test.com", "seller"));
        buyer = userRepository.save(User.create("buyer@test.com", "buyer"));
        Card card = cardRepository.save(Card.create("뮤츠 ex", "151", "SV2a-150", CardRarity.RR, null));
        listing = listingRepository.save(Listing.create(seller, card, PRICE, CardCondition.MINT, "test"));
    }

    @AfterEach
    void tearDown() {
        holder.shutdownNow();
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    @DisplayName("다른 트랜잭션이 매물 행을 잠그고 있으면 구매 요청은 약 3초 뒤 409 C002 로 실패한다")
    void purchaseFailsFastWhileListingIsLocked() throws Exception {
        CountDownLatch release = new CountDownLatch(1);
        Future<?> lockHolder = holdLock(() -> listingRepository.findByIdForUpdate(listing.getId()), release);

        long startedAt = System.nanoTime();
        ResultActions result = mockMvc.perform(post("/api/orders")
                .header("X-User-Id", buyer.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new CreateOrderRequest(listing.getId(), null, null))));
        long waitedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);

        release.countDown();
        lockHolder.get(10, TimeUnit.SECONDS);

        // CI 요약(.github/scripts/junit_summary.py)이 이 줄을 읽어 결과 표에 보여 준다.
        System.out.printf("[RESULT] 매물 행 잠금 중 구매 요청 → HTTP %d, %d ms 대기 후 응답%n",
                result.andReturn().getResponse().getStatus(), waitedMs);

        result.andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("C002"));
        assertThat(waitedMs).isBetween(2_500L, 10_000L);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.ON_SALE);
        assertThat(orderRepository.countByListingId(listing.getId())).isZero();
    }

    @Test
    @DisplayName("다른 트랜잭션이 주문 행을 잠그고 있으면 입금 웹훅은 약 3초 뒤 409 C002 로 실패하고 PG 재전송을 기다린다")
    void webhookFailsFastWhileOrderIsLocked() throws Exception {
        OrderResponse order = orderService.placeOrder(buyer.getId(), listing.getId());
        CountDownLatch release = new CountDownLatch(1);
        Future<?> lockHolder = holdLock(() -> orderRepository.findByOrderNoForUpdate(order.orderNo()), release);

        var deposit = new VirtualAccountDepositWebhookRequest(
                "tx-1", order.orderNo(), DepositStatus.DONE, PRICE, "buyer", LocalDateTime.now());
        long startedAt = System.nanoTime();
        ResultActions result = mockMvc.perform(post("/api/webhooks/payments/virtual-account")
                .header("X-Webhook-Secret", SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(deposit)));
        long waitedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);

        release.countDown();
        lockHolder.get(10, TimeUnit.SECONDS);

        System.out.printf("[RESULT] 주문 행 잠금 중 입금 웹훅 → HTTP %d, %d ms 대기 후 응답%n",
                result.andReturn().getResponse().getStatus(), waitedMs);

        result.andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("C002"));
        assertThat(waitedMs).isBetween(2_500L, 10_000L);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
    }

    /** 별도 스레드·트랜잭션에서 잠금을 잡고, release 될 때까지(최대 15초) 커밋하지 않는다. */
    private Future<?> holdLock(Runnable lock, CountDownLatch release) throws InterruptedException {
        CountDownLatch locked = new CountDownLatch(1);
        Future<?> future = holder.submit(() -> transactionTemplate.executeWithoutResult(tx -> {
            lock.run();
            locked.countDown();
            try {
                release.await(15, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }));
        assertThat(locked.await(10, TimeUnit.SECONDS)).isTrue();
        return future;
    }
}
