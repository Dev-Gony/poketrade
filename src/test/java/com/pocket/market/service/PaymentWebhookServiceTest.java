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
import com.pocket.market.domain.payment.RefundStatus;
import com.pocket.market.domain.payment.WebhookInbox;
import com.pocket.market.domain.payment.WebhookInboxResult;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.admin.RefundRequestResponse;
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
import com.pocket.market.repository.RefundRequestRepository;
import com.pocket.market.repository.UserRepository;
import com.pocket.market.repository.WebhookInboxRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

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
    private PaymentAuditService paymentAuditService;
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
        webhookInboxRepository.deleteAllInBatch();
        refundRequestRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    private VirtualAccountDepositWebhookRequest deposit(String txId, long amount) {
        return new VirtualAccountDepositWebhookRequest(
                txId, order.orderNo(), DepositStatus.DONE, amount, "buyer", LocalDateTime.now());
    }

    private List<WebhookInbox> inbox() {
        return webhookInboxRepository.findByOrderNoOrderByIdAsc(order.orderNo());
    }

    private ErrorCode errorCodeOf(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    @Test
    @DisplayName("정상 입금 통보 시 주문은 PAID, 매물은 SOLD 가 되고 inbox 에 PROCESSED 로 남는다")
    void depositCompletesOrder() {
        WebhookResponse response = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        assertThat(response.result()).isEqualTo(Result.PROCESSED);
        Order paid = orderRepository.findById(order.orderId()).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(paid.getPgTransactionId()).isEqualTo("tx-1");
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.SOLD);
        assertThat(inbox()).singleElement().satisfies(row -> {
            assertThat(row.getResult()).isEqualTo(WebhookInboxResult.PROCESSED);
            assertThat(row.getErrorCode()).isNull();
            assertThat(row.getProcessedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("동일 거래 웹훅을 재수신하면 ALREADY_PROCESSED 로 멱등 응답한다")
    void duplicateWebhookIsIdempotent() {
        WebhookResponse first = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));
        WebhookResponse second = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        assertThat(first.result()).isEqualTo(Result.PROCESSED);
        assertThat(second.result()).isEqualTo(Result.ALREADY_PROCESSED);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(inbox()).extracting(WebhookInbox::getResult)
                .containsExactly(WebhookInboxResult.PROCESSED, WebhookInboxResult.ALREADY_PROCESSED);
    }

    @Test
    @DisplayName("동일 거래 웹훅이 동시에 들어와도 결제 반영은 1회만 일어나고, 수신 건은 모두 inbox 에 남는다")
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
        System.out.printf("[RESULT] 같은 웹훅 %d건 동시 수신 → PROCESSED %d건, ALREADY_PROCESSED %d건, 예외 %d건, 매물 상태 %s, inbox 기록 %d건%n",
                threads,
                results.stream().filter(r -> r == Result.PROCESSED).count(),
                results.stream().filter(r -> r == Result.ALREADY_PROCESSED).count(),
                errors.size(),
                listingRepository.findById(listing.getId()).orElseThrow().getStatus(),
                inbox().size());

        assertThat(errors).isEmpty();
        List<Result> all = List.copyOf(results);
        assertThat(all).filteredOn(r -> r == Result.PROCESSED).hasSize(1);
        assertThat(all).filteredOn(r -> r == Result.ALREADY_PROCESSED).hasSize(threads - 1);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.SOLD);

        // 동시에 받은 8건 모두 inbox 에 남고, 결과는 응답과 1:1 로 일치한다.
        assertThat(inbox()).hasSize(threads);
        assertThat(webhookInboxRepository.countByOrderNoAndResult(order.orderNo(), WebhookInboxResult.PROCESSED)).isEqualTo(1);
        assertThat(webhookInboxRepository.countByOrderNoAndResult(order.orderNo(), WebhookInboxResult.ALREADY_PROCESSED))
                .isEqualTo(threads - 1);
    }

    @Test
    @DisplayName("입금 금액이 주문 금액과 다르면 거부하고 주문 상태를 유지하며, 거부 사유를 inbox 에 남긴다")
    void amountMismatchIsRejected() {
        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE - 1)))
                .isInstanceOf(BusinessException.class)
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.PAYMENT_AMOUNT_MISMATCH);

        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus())
                .isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus())
                .isEqualTo(ListingStatus.RESERVED);

        // 처리 트랜잭션은 롤백됐지만 수신 기록은 남는다.
        assertThat(inbox()).singleElement().satisfies(row -> {
            assertThat(row.getResult()).isEqualTo(WebhookInboxResult.REJECTED);
            assertThat(row.getErrorCode()).isEqualTo(ErrorCode.PAYMENT_AMOUNT_MISMATCH);
            assertThat(row.getAmount()).isEqualTo(PRICE - 1);
            assertThat(row.getTransactionId()).isEqualTo("tx-1");
            assertThat(row.getPayload()).contains("\"transactionId\":\"tx-1\"");
            assertThat(row.getProcessedAt()).isNotNull();
        });
    }

    @Test
    @DisplayName("이미 결제된 주문에 다른 거래로 또 입금되면 REFUND_REQUIRED 로 기록하고, 재전송돼도 환불 건은 1건이다")
    void differentTransactionOnPaidOrderRequiresRefund() {
        paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));

        WebhookResponse second = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-2", PRICE));
        WebhookResponse retried = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-2", PRICE));

        assertThat(second.result()).isEqualTo(Result.REFUND_REQUIRED);
        assertThat(retried.result()).isEqualTo(Result.REFUND_REQUIRED);

        Order paid = orderRepository.findById(order.orderId()).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(paid.getPgTransactionId()).isEqualTo("tx-1");

        assertThat(refundRequestRepository.findByOrderId(order.orderId())).singleElement().satisfies(refund -> {
            assertThat(refund.getPgTransactionId()).isEqualTo("tx-2");
            assertThat(refund.getReason()).isEqualTo(RefundReason.ALREADY_PAID);
            assertThat(refund.getStatus()).isEqualTo(RefundStatus.REFUND_REQUIRED);
            assertThat(refund.getAmount()).isEqualTo(PRICE);
        });
        assertThat(inbox()).extracting(WebhookInbox::getResult).containsExactly(
                WebhookInboxResult.PROCESSED, WebhookInboxResult.REFUND_REQUIRED, WebhookInboxResult.REFUND_REQUIRED);
    }

    @Test
    @DisplayName("만료된 주문에 입금되면 REFUND_REQUIRED(ORDER_EXPIRED) 로 기록하고 매물은 판매중을 유지한다")
    void depositOnExpiredOrderRequiresRefund() {
        assertThat(orderService.expireOrder(order.orderId(), LocalDateTime.now().plusHours(25))).isTrue();

        WebhookResponse response = paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-late", PRICE));

        assertThat(response.result()).isEqualTo(Result.REFUND_REQUIRED);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.EXPIRED);
        assertThat(listingRepository.findById(listing.getId()).orElseThrow().getStatus()).isEqualTo(ListingStatus.ON_SALE);
        assertThat(refundRequestRepository.findByOrderId(order.orderId()))
                .singleElement()
                .extracting(RefundRequest::getReason)
                .isEqualTo(RefundReason.ORDER_EXPIRED);
    }

    @Test
    @DisplayName("환불 대상과 웹훅 수신 기록은 운영자 조회(PaymentAuditService)로 확인할 수 있다")
    void refundsAndInboxAreQueryable() {
        paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-1", PRICE));
        paymentWebhookService.handleVirtualAccountDeposit(SECRET, deposit("tx-2", PRICE));

        List<RefundRequestResponse> refunds = paymentAuditService
                .findRefunds(RefundStatus.REFUND_REQUIRED, PageRequest.of(0, 10)).getContent();
        assertThat(refunds).singleElement().satisfies(refund -> {
            assertThat(refund.orderNo()).isEqualTo(order.orderNo());
            assertThat(refund.orderStatus()).isEqualTo(OrderStatus.PAID);
            assertThat(refund.pgTransactionId()).isEqualTo("tx-2");
            assertThat(refund.reason()).isEqualTo(RefundReason.ALREADY_PAID);
        });
        assertThat(paymentAuditService.findWebhookInbox(order.orderNo(), WebhookInboxResult.REFUND_REQUIRED, PageRequest.of(0, 10)))
                .singleElement()
                .satisfies(row -> assertThat(row.transactionId()).isEqualTo("tx-2"));
        assertThat(paymentAuditService.findWebhookInbox(order.orderNo(), null, PageRequest.of(0, 10)).getTotalElements())
                .isEqualTo(2);
    }

    @Test
    @DisplayName("DONE 이 아닌 상태 통보는 IGNORED 로 기록하고 주문을 건드리지 않는다")
    void nonDoneStatusIsIgnored() {
        WebhookResponse response = paymentWebhookService.handleVirtualAccountDeposit(SECRET,
                new VirtualAccountDepositWebhookRequest("tx-wait", order.orderNo(), DepositStatus.WAITING_FOR_DEPOSIT,
                        PRICE, "buyer", null));

        assertThat(response.result()).isEqualTo(Result.IGNORED);
        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(inbox()).singleElement().extracting(WebhookInbox::getResult).isEqualTo(WebhookInboxResult.IGNORED);
    }

    @Test
    @DisplayName("존재하지 않는 주문번호로 온 웹훅도 REJECTED(ORDER_NOT_FOUND) 로 남는다")
    void unknownOrderIsRecorded() {
        VirtualAccountDepositWebhookRequest unknown = new VirtualAccountDepositWebhookRequest(
                "tx-x", "ORD-UNKNOWN", DepositStatus.DONE, PRICE, "buyer", null);

        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit(SECRET, unknown))
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.ORDER_NOT_FOUND);

        assertThat(webhookInboxRepository.findByOrderNoOrderByIdAsc("ORD-UNKNOWN"))
                .singleElement()
                .satisfies(row -> {
                    assertThat(row.getResult()).isEqualTo(WebhookInboxResult.REJECTED);
                    assertThat(row.getErrorCode()).isEqualTo(ErrorCode.ORDER_NOT_FOUND);
                });
    }

    @Test
    @DisplayName("웹훅 시크릿이 틀리면 INVALID_WEBHOOK_SIGNATURE 로 거부하고, 호출 사실은 inbox 에 남긴다")
    void invalidSecretIsRejected() {
        assertThatThrownBy(() -> paymentWebhookService.handleVirtualAccountDeposit("wrong", deposit("tx-1", PRICE)))
                .isInstanceOf(BusinessException.class)
                .extracting(this::errorCodeOf)
                .isEqualTo(ErrorCode.INVALID_WEBHOOK_SIGNATURE);

        assertThat(orderRepository.findById(order.orderId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(inbox()).singleElement().satisfies(row -> {
            assertThat(row.getResult()).isEqualTo(WebhookInboxResult.REJECTED);
            assertThat(row.getErrorCode()).isEqualTo(ErrorCode.INVALID_WEBHOOK_SIGNATURE);
        });
    }
}
