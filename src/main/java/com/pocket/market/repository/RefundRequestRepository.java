package com.pocket.market.repository;

import com.pocket.market.domain.payment.RefundRequest;
import com.pocket.market.domain.payment.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    boolean existsByPgTransactionId(String pgTransactionId);

    List<RefundRequest> findByOrderId(Long orderId);

    @EntityGraph(attributePaths = "order")
    Page<RefundRequest> findByStatus(RefundStatus status, Pageable pageable);
}
