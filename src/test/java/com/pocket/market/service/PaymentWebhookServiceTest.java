package com.pocket.market.service;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class PaymentWebhookServiceTest {

    private static final String SECRET = "test-webhook-secret";
    private static final long PRICE = 15_000L;

    @Autowired
    private PaymentWebhookService paymentWebhookService;
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
        order = orderService.placeOrder(buyer.getId(), listing.getId());
    }

    @AfterEach
    void tearDown() {
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    private VirtualAccountDepositWebhookRequest deposit(String txId, long amount) {
        return new VirtualAccountDepositWebhookRequest(
                txId, order.orderNo(), DepositStatus.DONE, amount, "buyer", LocalDateTime.now());
    }

    @Test
    @DisplayName("정상 입금 통보 시 주문은 PAID, 매물은 SOLD 가 된다")
    void depositCompletesOrder() {
        WebhookResponse response = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        assertThat(response.result()).isEqualTo(Result.PROCESSED);
        Order paid = orderRepository.findById(order.orderId()).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(paid.getPgTransactionId()).isEqualTo("tx-1");
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.SOLD);
    }

    @Test
    @DisplayName("동일 거래 웹훅을 재수신하면 ALREADY_PROCESSED 로 멱등 응답한다")
    void duplicateWebhookIsIdempotent() {
        WebhookResponse first = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));
        WebhookResponse second = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        assertThat(first.result()).isEqualTo(Result.PROCESSED);
        assertThat(second.result()).isEqualTo(Result.ALREADY_PROCESSED);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    @DisplayName("동일 거래 웹훅이 동시에 들어와도 결제 반영은 1회만 일어난다")
    void concurrentDuplicateWebhooksProcessOnce() throws InterruptedException {
        int threads = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        Queue<Result> results = new ConcurrentLinkedQueue<>();
        Queue<Throwable> errors = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    start.await();
                    results.add(paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE)).result());
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    done.countDown();
                }
            });
        }
        start.countDown();
        assertThat(done.await(30, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        // CI 요약(.github/scripts/junit_summary.py)이 이 줄을 읽어 결과 표에 보여 준다.
        System.out.printf("[RESULT] 같은 웹훅 %d건 동시 수신 → PROCESSED %d건, ALREADY_PROCESSED %d건, 예외 %d건, 매물 상태 %s%n",
                threads,
                results.stream().filter(r -> r == Result.PROCESSED).count(),
                results.stream().filter(r -> r == Result.ALREADY_PROCESSED).count(),
                errors.size(),
                listingRepository.findById(listing.getId()).orElseThrow().getStatus());

        assertThat(errors).isEmpty();
        List<Result> all = List.copyOf(results);
        assertThat(all).filteredOn(r -> r == Result.PROCESSED).hasSize(1);
        assertThat(all).filteredOn(r -> r == Result.ALREADY_PROCESSED).hasSize(threads - 1);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.SOLD);
    }

    @Test
    @DisplayName("입금 금액이 주문 금액과 다르면 거부하고 주문 상태를 유지한다")
    void amountMismatchIsRejected() {
        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE - 1)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PAYMENT_AMOUNT_MISMATCH);

        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.RESERVED);
    }

    @Test
    @DisplayName("이미 결제된 주문에 다른 거래 ID 로 입금 통보가 오면 DUPLICATE_TRANSACTION")
    void differentTransactionOnPaidOrderIsRejected() {
        paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-2", PRICE)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.DUPLICATE_TRANSACTION);
    }

    @Test
    @DisplayName("웹훅 시크릿이 틀리면 INVALID_WEBHOOK_SIGNATURE")
    void invalidSecretIsRejected() {
        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit("wrong", deposit("tx-1", PRICE)))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
    }
}
