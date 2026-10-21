package com.pocket.market.service;

import com.pocket.market.config.AppProperties;
import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import com.pocket.market.domain.user.User;
import com.pocket.market.dto.order.OrderResponse;
import com.pocket.market.exception.BusinessException;
import com.pocket.market.exception.ErrorCode;
import com.pocket.market.repository.ListingRepository;
import com.pocket.market.repository.LockTimeout;
import com.pocket.market.repository.OrderRepository;
import com.pocket.market.repository.UserRepository;
import com.pocket.market.service.payment.VirtualAccountBank;
import com.pocket.market.service.payment.VirtualAccountIssuer;
import com.pocket.market.service.payment.VirtualAccountIssuer.IssuedVirtualAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final VirtualAccountIssuer virtualAccountIssuer;
    private final LockTimeout lockTimeout;
    private final AppProperties appProperties;

    /**
     * 즉시 구매.
     * 1) 매물 행을 PESSIMISTIC_WRITE(SELECT ... FOR UPDATE)로 잠가 동시 요청을 직렬화한다.
     *    대기 상한은 LockTimeout(PostgreSQL lock_timeout)으로 걸고, 넘기면 409 C002 로 응답한다.
     * 2) 상태가 ON_SALE 인 경우에만 RESERVED 로 전이(재고 선점)하고 주문을 생성한다.
     * 3) 뒤따르는 요청은 락 해제 후 RESERVED 상태를 읽고 LISTING_NOT_AVAILABLE 로 실패한다.
     */
    @Transactional
    public OrderResponse placeOrder(Long buyerId, Long listingId) {
        return placeOrder(buyerId, listingId, null, null);
    }

    /**
     * @param bank          가상계좌 발급 은행 (null 이면 KB)
     * @param depositorName 입금자명 (비어 있으면 구매자 닉네임)
     */
    @Transactional
    public OrderResponse placeOrder(Long buyerId, Long listingId, VirtualAccountBank bank, String depositorName) {
        User buyer = userRepository.findById(buyerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        lockTimeout.apply();
        Listing listing = listingRepository.findByIdForUpdate(listingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LISTING_NOT_FOUND));

        if (listing.isSoldBy(buyerId)) {
            throw new BusinessException(ErrorCode.SELF_PURCHASE_NOT_ALLOWED);
        }

        listing.reserve();

        LocalDateTime dueAt = LocalDateTime.now().plusHours(appProperties.getPaymentDueHours());
        Order order = orderRepository.save(Order.create(buyer, listing, dueAt));

        String depositor = (depositorName == null || depositorName.isBlank()) ? buyer.getNickname() : depositorName.trim();
        IssuedVirtualAccount account = virtualAccountIssuer.issue(
                order.getOrderNo(), order.getAmount(), depositor, bank == null ? VirtualAccountBank.KB : bank);
        order.assignVirtualAccount(account.bank(), account.accountNumber(), depositor);

        log.info("[Order] 주문 생성 orderNo={}, listingId={}, buyerId={}", order.getOrderNo(), listingId, buyerId);
        return OrderResponse.from(order);
    }

    public OrderResponse getOrder(Long orderId) {
        return orderRepository.findWithDetailsById(orderId)
                .map(OrderResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));
    }

    public List<Long> findOverdueOrderIds(LocalDateTime now) {
        return orderRepository.findIdsByStatusAndPaymentDueAtBefore(OrderStatus.PENDING_PAYMENT, now);
    }

    /**
     * 입금 기한이 지난 주문을 만료시키고 매물을 다시 판매중으로 되돌린다.
     * 웹훅과 경합할 수 있으므로 주문 행을 잠근 뒤 상태를 재확인한다.
     */
    @Transactional
    public boolean expireOrder(Long orderId, LocalDateTime now) {
        lockTimeout.apply();
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PENDING_PAYMENT || !order.getPaymentDueAt().isBefore(now)) {
            return false;
        }
        order.expire();
        log.info("[Order] 입금 기한 만료 orderNo={}", order.getOrderNo());
        return true;
    }
}
