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
    private final AppProperties appProperties;

    /**
     * 즉시 구매.
     * 1) 매물 행을 PESSIMISTIC_WRITE(SELECT ... FOR UPDATE)로 잠가 동시 요청을 직렬화한다.
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

    /**
     * 구매자 취소. 입금 전(PENDING_PAYMENT)인 주문만 취소할 수 있고, 선점한 매물은 다시 판매중으로 돌아간다.
     * 입금 웹훅·만료 스케줄러와 같은 주문 행 락을 잡으므로 셋 중 먼저 락을 얻은 쪽만 상태를 바꾼다.
     * 취소가 이기면 뒤이은 입금은 환불 대상(REFUND_REQUIRED)으로, 입금이 이기면 취소는 INVALID_ORDER_STATE 로 끝난다.
     */
    @Transactional
    public OrderResponse cancelOrder(Long buyerId, Long orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ORDER_NOT_FOUND));

        if (!order.isOrderedBy(buyerId)) {
            throw new BusinessException(ErrorCode.ORDER_ACCESS_DENIED);
        }
        order.cancel(LocalDateTime.now());

        log.info("[Order] 구매자 취소 orderNo={}, buyerId={}", order.getOrderNo(), buyerId);
        return OrderResponse.from(order);
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
