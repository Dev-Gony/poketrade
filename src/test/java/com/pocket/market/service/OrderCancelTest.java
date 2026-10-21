package com.pocket.market.service;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.payment.RefundReason;
import com.pocket.market.domain.payment.RefundRequest;
import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest;
import com.pocket.market.dto.webhook.VirtualAccountDepositWebhookRequest.DepositStatus;
import com.pocket.market.dto.webhook.WebhookResponse.Result;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.CardRepository;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.RefundRequestRepository;
import com.pocket.market.repository.UserRepository;
import com.pocket.market.repository.WebhookInboxRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 구매자 취소와, 취소가 입금 웹훅·만료 스케줄러와 경합할 때의 상태 일관성을 검증한다.
 * 각 스레드가 독립 트랜잭션으로 커밋해야 하므로 테스트 클래스에 @Transactional 을 붙이지 않는다.
 */
@SpringBootTest
class OrderCancelTest {

    private static final String SECRET = "test-webhook-secret";
    private static final long PRICE = 98_000L;
    private static final int RACE_ROUNDS = 20;

    @Autowired
    private OrderService orderService;
    @Autowired
    private PaymentWebhookService paymentWebhookService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CardRepository cardRepository;
    @Autowired
    private ListingRepository listingRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private WebhookInboxRepository webhookInboxRepository;
    @Autowired
    private RefundRequestRepository refundRequestRepository;

    private User seller;
    private User buyer;
    private Card card;

    @BeforeEach
    void setUp() {
        seller = userRepository.save(User.create("seller@test.com", "seller"));
        buyer = userRepository.save(User.create("buyer@test.com", "buyer"));
        card = cardRepository.save(Card.create("뮤 ex", "151", "SV2a-205", CardRarity.UR, null));
    }

    @AfterEach
    void tearDown() {
        webhookInboxRepository.deleteAllInBatch();
        refundRequestRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    private OrderResponse placeNewOrder() {
        Listing listing = listingRepository.save(Listing.create(seller, card, PRICE, CardCondition.MINT, "test"));
        return orderService.placeOrder(buyer.getId(), listing.getId());
    }

    private VirtualAccountDepositWebhookRequest deposit(OrderResponse order, String txId) {
        return new VirtualAccountDepositWebhookRequest(
                txId, order.orderNo(), DepositStatus.DONE, order.amount(), "buyer", LocalDateTime.now());
    }

    private ListingStatus listingStatus(OrderResponse order) {
        return listingRepository.findById(order.listingId()).orElseThrow().getStatus();
    }

    private ErrorCode errorCodeOf(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    @Test
    @DisplayName("입금 전 주문을 취소하면 주문은 CANCELLED, 매물은 다시 ON_SALE 이 된다")
    void cancelReleasesListing() {
        OrderResponse order = placeNewOrder();

        OrderResponse cancelled = orderService.cancelOrder(buyer.getId(), order.orderId());

        assertThat(cancelled.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(cancelled.cancelledAt()).isNotNull();
        assertThat(listingStatus(order)).isEqualTo(ListingStatus.ON_SALE);

        // 풀린 매물은 다른 사람이 다시 살 수 있다.
        User another = userRepository.save(User.create("another@test.com", "another"));
        assertThat(orderService.placeOrder(another.getId(), order.listingId()).status()).isEqualTo(OrderStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("구매자 본인이 아니면 취소할 수 없다 (ORDER_ACCESS_DENIED)")
    void onlyBuyerCanCancel() {
        OrderResponse order = placeNewOrder();

        assertThatThrownBy(() -> orderService.cancelOrder(seller.getId(), order.orderId()))
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.ORDER_ACCESS_DENIED);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(listingStatus(order)).isEqualTo(ListingStatus.RESERVED);
    }

    @Test
    @DisplayName("이미 결제되었거나 취소된 주문은 다시 취소할 수 없다 (INVALID_ORDER_STATE)")
    void cannotCancelPaidOrCancelledOrder() {
        OrderResponse paid = placeNewOrder();
        paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit(paid, "tx-paid"));
        assertThatThrownBy(() -> orderService.cancelOrder(buyer.getId(), paid.orderId()))
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.INVALID_ORDER_STATE);
        assertThat(listingStatus(paid)).isEqualTo(ListingStatus.SOLD);

        OrderResponse cancelled = placeNewOrder();
        orderService.cancelOrder(buyer.getId(), cancelled.orderId());
        assertThatThrownBy(() -> orderService.cancelOrder(buyer.getId(), cancelled.orderId()))
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.INVALID_ORDER_STATE);
    }

    @Test
    @DisplayName("취소된 주문은 만료 스케줄러가 건드리지 않는다")
    void expireSkipsCancelledOrder() {
        OrderResponse order = placeNewOrder();
        orderService.cancelOrder(buyer.getId(), order.orderId());

        assertThat(orderService.expireOrder(order.orderId(), LocalDateTime.now().plusHours(25))).isFalse();
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(listingStatus(order)).isEqualTo(ListingStatus.ON_SALE);
    }

    @Test
    @DisplayName("취소와 입금 웹훅이 동시에 오면 정확히 한쪽만 이기고, 진 입금은 환불 대상으로 남는다")
    void cancelVersusDepositRace() throws Exception {
        int cancelWins = 0;
        int depositWins = 0;
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            for (int round = 0; round < RACE_ROUNDS; round++) {
                OrderResponse order = placeNewOrder();
                String txId = "tx-race-" + round;
                CountDownLatch start = new CountDownLatch(1);
                // 웹훅은 락을 잡기 전에 inbox 기록 트랜잭션을 먼저 커밋하므로 그대로 두면 취소가 거의 항상 먼저 락을 얻는다.
                // 홀수 회차는 취소를 조금 늦게 출발시켜 입금이 이기는 경로도 함께 검증한다.
                long cancelDelayMs = round % 2 == 0 ? 0 : 30;

                Future<OrderResponse> cancel = executor.submit(() -> {
                    start.await();
                    Thread.sleep(cancelDelayMs);
                    return orderService.cancelOrder(buyer.getId(), order.orderId());
                });
                Future<Result> webhook = executor.submit(() -> {
                    start.await();
                    return paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit(order, txId)).result();
                });
                start.countDown();

                Throwable cancelError = null;
                try {
                    cancel.get(30, TimeUnit.SECONDS);
                } catch (ExecutionException e) {
                    cancelError = e.getCause();
                }
                // 웹훅은 어느 쪽이 이기든 예외 없이 응답해야 한다 (PROCESSED 또는 REFUND_REQUIRED).
                Result webhookResult = webhook.get(30, TimeUnit.SECONDS);

                Order reloaded = orderRepository.findById(order.orderId()).orElseThrow();
                List<RefundRequest> refunds = refundRequestRepository.findByOrderId(order.orderId());
                List<WebhookInbox> inbox = webhookInboxRepository.findByOrderNoOrderByIdAsc(order.orderNo());

                if (cancelError == null) {
                    cancelWins++;
                    assertThat(webhookResult).isEqualTo(Result.REFUND_REQUIRED);
                    assertThat(reloaded.getStatus()).isEqualTo(OrderStatus.CANCELLED);
                    assertThat(reloaded.getPgTransactionId()).isNull();
                    assertThat(listingStatus(order)).isEqualTo(ListingStatus.ON_SALE);
                    assertThat(refunds).singleElement().satisfies(refund -> {
                        assertThat(refund.getReason()).isEqualTo(RefundReason.ORDER_CANCELLED);
                        assertThat(refund.getPgTransactionId()).isEqualTo(txId);
                    });
                    assertThat(inbox).singleElement().extracting(WebhookInbox::getResult)
                            .isEqualTo(WebhookInboxResult.REFUND_REQUIRED);
                } else {
                    depositWins++;
                    assertThat(cancelError).isInstanceOf(BusinessException.class);
                    assertThat(errorCodeOf(cancelError)).isEqualTo(ErrorCode.INVALID_ORDER_STATE);
                    assertThat(webhookResult).isEqualTo(Result.PROCESSED);
                    assertThat(reloaded.getStatus()).isEqualTo(OrderStatus.PAID);
                    assertThat(reloaded.getCancelledAt()).isNull();
                    assertThat(listingStatus(order)).isEqualTo(ListingStatus.SOLD);
                    assertThat(refunds).isEmpty();
                    assertThat(inbox).singleElement().extracting(WebhookInbox::getResult)
                            .isEqualTo(WebhookInboxResult.PROCESSED);
                }
            }
        } finally {
            executor.shutdown();
        }

        // CI 요약(.github/scripts/junit_summary.py)이 이 줄을 읽어 결과 표에 보여 준다.
        System.out.printf("[RESULT] 취소 vs 입금 웹훅 동시 요청 %d회 → 취소 승 %d회(입금은 환불 대상 기록), 입금 승 %d회(취소 거부), 불일치 0회%n",
                RACE_ROUNDS, cancelWins, depositWins);
        assertThat(cancelWins + depositWins).isEqualTo(RACE_ROUNDS);
    }
}
