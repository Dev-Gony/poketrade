package com.pocket.market.repository;

import com.pocket.market.domain.order.Order;
import com.pocket.market.domain.order.OrderStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** 웹훅 중복 수신 시 동일 주문에 대한 처리를 직렬화하기 위한 비관적 락 조회 (대기 상한: {@link LockTimeout#apply()}) */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.orderNo = :orderNo")
    Optional<Order> findByOrderNoForUpdate(@Param("orderNo") String orderNo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"listing", "listing.card", "buyer"})
    @Query("select o from Order o where o.id = :id")
    Optional<Order> findWithDetailsById(@Param("id") Long id);

    @Query("select o.id from Order o where o.status = :status and o.paymentDueAt < :now")
    List<Long> findIdsByStatusAndPaymentDueAtBefore(@Param("status") OrderStatus status,
                                                    @Param("now") LocalDateTime now);

    long countByListingId(Long listingId);
}
