package com.pocket.market.service;

import com.pocket.market.domain.card.Card;
import com.pocket.market.domain.card.CardRarity;
import com.pocket.market.domain.listing.CardCondition;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import com.pocket.market.domain.user.User;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 동일 매물에 대한 동시 즉시 구매 요청 시 비관적 락으로 단 1건만 성공하는지 검증한다.
 * 각 스레드가 독립 트랜잭션으로 커밋해야 하므로 테스트 클래스에 @Transactional 을 붙이지 않는다.
 */
@SpringBootTest
class OrderConcurrencyTest {

    private static final int THREAD_COUNT = 20;

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
    private final List<User> buyers = new ArrayList<>();

    @BeforeEach
    void setUp() {
        User seller = userRepository.save(User.create("seller@test.com", "seller"));
        Card card = cardRepository.save(Card.create("리자몽 ex", "흑염의 지배자", "SV3-125", CardRarity.SAR, null));
        listing = listingRepository.save(Listing.create(seller, card, 120_000L, CardCondition.MINT, "test"));

        for (int i = 0; i < THREAD_COUNT; i++) {
            buyers.add(userRepository.save(User.create("buyer" + i + "@test.com", "buyer" + i)));
        }
    }

    @AfterEach
    void tearDown() {
        orderRepository.deleteAllInBatch();
        listingRepository.deleteAllInBatch();
        cardRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        buyers.clear();
    }

    @Test
    @DisplayName("동일 매물에 동시에 주문하면 1건만 성공하고 나머지는 LISTING_NOT_AVAILABLE 로 실패한다")
    void onlyOneOrderSucceedsUnderConcurrency() throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        CountDownLatch ready = new CountDownLatch(THREAD_COUNT);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREAD_COUNT);

        AtomicInteger successCount = new AtomicInteger();
        Queue<Throwable> failures = new ConcurrentLinkedQueue<>();

        for (User buyer : buyers) {
            executor.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    orderService.placeOrder(buyer.getId(), listing.getId());
                    successCount.incrementAndGet();
                } catch (Throwable t) {
                    failures.add(t);
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await();
        start.countDown(); // 모든 스레드를 동시에 출발시킨다
        assertThat(done.await(30, TimeUnit.SECONDS)).isTrue();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failures).hasSize(THREAD_COUNT - 1);
        assertThat(failures).allSatisfy(t -> {
            assertThat(t).isInstanceOf(BusinessException.class);
            assertThat(((BusinessException) t).getErrorCode()).isEqualTo(ErrorCode.LISTING_NOT_AVAILABLE);
        });

        Listing reloaded = listingRepository.findById(listing.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ListingStatus.RESERVED);
        assertThat(orderRepository.countByListingId(listing.getId())).isEqualTo(1);
    }
}
