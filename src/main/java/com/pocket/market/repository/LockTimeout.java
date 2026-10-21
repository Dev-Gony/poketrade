package com.pocket.market.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceContext;
import org.hibernate.dialect.PostgreSQLDialect;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 비관적 락 대기 상한을 DB 수준에서 건다.
 * <p>
 * Hibernate 6 의 PostgreSQL 방언은 {@code jakarta.persistence.lock.timeout} 힌트를 SQL 로 옮기지 못한다
 * (PostgreSQL 에는 {@code FOR UPDATE WAIT n} 이 없어 0 → NOWAIT 만 지원). 힌트만 두면 앞선 트랜잭션이
 * 끝날 때까지 무한정 기다리므로, PostgreSQL 에서는 잠금 조회 직전에 현재 트랜잭션에만 적용되는
 * {@code lock_timeout} 을 설정한다. 시간이 초과되면 SQLState 55P03 → {@code PessimisticLockingFailureException}
 * 으로 변환되어 409 C002 로 응답된다. H2(테스트·오프라인)는 JDBC URL 의 LOCK_TIMEOUT 이 같은 역할을 한다.
 */
@Component
public class LockTimeout {

    @PersistenceContext
    private EntityManager entityManager;

    private final boolean postgres;
    private final String timeout;

    public LockTimeout(EntityManagerFactory entityManagerFactory,
                       @Value("${app.lock.timeout-ms:3000}") long timeoutMs) {
        this.postgres = entityManagerFactory.unwrap(SessionFactoryImplementor.class)
                .getJdbcServices().getDialect() instanceof PostgreSQLDialect;
        this.timeout = timeoutMs + "ms";
    }

    /** 호출한 트랜잭션이 끝나면 설정도 사라진다 (SET LOCAL 과 같음). 커넥션 풀로 새어 나가지 않는다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void apply() {
        if (postgres) {
            entityManager.createNativeQuery("select set_config('lock_timeout', :timeout, true)")
                    .setParameter("timeout", timeout)
                    .getSingleResult();
        }
    }
}
