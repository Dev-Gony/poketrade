package com.pocket.market.repository;

import com.pocket.market.domain.listing.Listing;
import com.pocket.market.domain.listing.ListingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface ListingRepository extends JpaRepository<Listing, Long> {

    /**
     * SELECT ... FOR UPDATE 로 매물 행을 잠근다.
     * 동시에 들어온 구매 요청은 앞선 트랜잭션이 커밋될 때까지 대기한 뒤 변경된 상태(RESERVED)를 읽게 된다.
     * 대기 상한은 호출 전에 {@link LockTimeout#apply()} 로 건다 (jakarta.persistence.lock.timeout 힌트는 PostgreSQL 에서 무시됨).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Listing l where l.id = :id")
    Optional<Listing> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"card", "seller"})
    @Query("select l from Listing l where l.id = :id")
    Optional<Listing> findWithDetailsById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"card", "seller"})
    Page<Listing> findByStatusIn(Collection<ListingStatus> statuses, Pageable pageable);

    /** 카드 코드로 가장 최근 매물을 조회한다 (상태 무관). */
    @EntityGraph(attributePaths = {"card", "seller"})
    Optional<Listing> findFirstByCardCodeOrderByIdDesc(String cardCode);
}
